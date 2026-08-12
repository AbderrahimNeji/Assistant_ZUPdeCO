import * as React from 'react';
import { User, BookOpen, Clock, Building2, Calendar, Mail, UserCog } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AvailabilityGrid } from '@/components/forms/AvailabilityGrid';
import { DateSplitInput } from '@/components/forms/DateSplitInput';
import { toast } from '@/lib/toast';
import { getVolunteer, getCoordinators, getRoles } from '@/services/users.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useEnrichEstablishmentLabels } from '@/hooks/useEnrichEstablishmentLabels';
import { updateVolunteer } from '@/services/volunteers.service';
import { getSubjects } from '@/services/academic.service';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { getEditableRoles } from '@/utils/interface-hierarchy';
import { buildCreatableRoleOptions } from '@/utils/creatable-role-options';
import type { UpdateVolunteerDto } from '@/types/volunteer.types';
import { normalizeStaffAccountStatus, type UserAccountStatus } from '@/types/user.types';
import type { AvailabilitySlot } from '@/components/forms/AvailabilityGrid';
import { useFormValidation } from '@/hooks/useFormValidation';
import { volunteerEditValidationSchema } from '@/utils/validation-schemas';
import { resolveStoredContact, phoneToE164 } from '@/utils/phone-contact-utils';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { RegenerateInvitationButton } from '@/components/common/RegenerateInvitationButton';
import { useAuthStore } from '@/stores/authStore';
import { addDaysToDateString } from '@/lib/date-utils';
import { SHOW_VSC_REPORTS_FREQUENCY_FORM_SECTION } from '@/components/volunteers/volunteer-configs';

interface EditVolunteerViewProps {
  volunteerId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditVolunteerView: React.FC<EditVolunteerViewProps> = ({
  volunteerId,
  onClose,
  onSuccess,
}) => {
  const authUser = useAuthStore((s) => s.user);
  const authRoles = useAuthStore((s) => s.roles);
  const { elements: volunteerElements = [] } = useInterfaceElements('volunteers');
  const availableRoles = React.useMemo(
    () => getEditableRoles(volunteerElements),
    [volunteerElements],
  );
  const isSingleRoleMode = availableRoles.length <= 1;

  const hideCoordinatorField =
    authRoles.some((r) => r.code.toLowerCase() === 'coordinator') &&
    !authRoles.some((r) => ['admin', 'manager'].includes(r.code.toLowerCase()));

  const defaultCountry = useDefaultPhoneCountry();
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<string>(defaultCountry);

  const [formData, setFormData] = React.useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    email?: string;
    phone?: string;
    status: string;
    roleIds: string[];
    managedById: string;
    establishmentIds: string[];
    subjects: string[];
    availability: { weekly: AvailabilitySlot[] };
    vscReportsFrequencies: { daily: boolean; weekly: boolean };
    engagementStartDate: string;
    engagementEndDate: string;
    gender: 'M' | 'F' | 'O' | '';
  }>({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    status: 'active',
    roleIds: [],
    managedById: '',
    establishmentIds: [],
    subjects: [],
    availability: { weekly: [] },
    vscReportsFrequencies: { daily: false, weekly: false },
    engagementStartDate: '',
    engagementEndDate: '',
    gender: '',
  });

  const validation = useFormValidation(volunteerEditValidationSchema);

  const { data: volunteer, isLoading } = useQuery({
    queryKey: ['volunteers', volunteerId],
    queryFn: () => getVolunteer(volunteerId),
    refetchOnMount: 'always',
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
  });

  const effectiveManagedById =
    hideCoordinatorField && authUser?.id ? authUser.id : formData.managedById;

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
    primeLabelCache: primeEstabLabelCache,
  } = useEstablishmentsMultiselect();

  useEnrichEstablishmentLabels(formData.establishmentIds, primeEstabLabelCache);

  const { data: coordinatorsResponse } = useQuery({
    queryKey: ['coordinators'],
    queryFn: () => getCoordinators({ pageSize: 100 }),
    enabled: !hideCoordinatorField,
  });
  const coordinators = coordinatorsResponse?.data || [];

  const extractEstablishmentLabels = React.useCallback((ueList: any[]) => {
    const labelEntries: Array<{ id: string; name: string }> = [];
    for (const ue of ueList) {
      const id = ue.establishmentId;
      const name = ue.establishment?.name?.trim();
      if (id && name) labelEntries.push({ id, name });
    }
    return labelEntries;
  }, []);

  const buildInitialFormData = React.useCallback(
    (volunteer: any, managedById: string, establishmentIds: string[], stored: any) => {
      const dateDebut = volunteer.userProfiles?.[0]?.engagementStartDate;
      const dateFin = volunteer.userProfiles?.[0]?.engagementEndDate;

      return {
        firstName: volunteer.firstName || '',
        lastName: volunteer.lastName || '',
        displayName: volunteer.displayName || '',
        phone: stored.mode === 'phone' ? stored.displayValue : volunteer.phone || '',
        status: normalizeStaffAccountStatus(String(volunteer.status)),
        roleIds: (volunteer.userRoles?.map((ur: any) => ur.roleId) || []) as string[],
        managedById,

        establishmentIds,
        subjects: (volunteer.userProfiles?.[0]?.subjects || []) as string[],
        availability: (volunteer.userProfiles?.[0]?.availability as {
          weekly: AvailabilitySlot[];
        }) || {
          weekly: [],
        },
        vscReportsFrequencies: (volunteer.userProfiles?.[0]?.vscReportsFrequencies as {
          daily: boolean;
          weekly: boolean;
        }) || {
          daily: false,
          weekly: false,
        },
        engagementStartDate: dateDebut ? new Date(dateDebut).toISOString().split('T')[0] : '',
        engagementEndDate: dateFin ? new Date(dateFin).toISOString().split('T')[0] : '',
        gender: (() => {
          const g = volunteer.userProfiles?.[0]?.gender;
          return (g === 'M' || g === 'F' || g === 'O' ? g : '') as 'M' | 'F' | 'O' | '';
        })(),
        targetHours: (() => {
          const h = volunteer.userProfiles?.[0]?.targetHours;
          return (h != null ? Number(h) : '') as '' | number;
        })(),
        exitReason: (() => {
          const r = (volunteer.userProfiles?.[0] as any)?.exitReason ?? '';
          // Normalize legacy "Autre: {note}" format → "Autre"
          return r.startsWith('Autre:') ? 'Autre' : r;
        })(),
        exitReasonNote: (() => {
          // Prefer dedicated DB column; fall back to legacy "Autre: {note}" parsing
          const note = (volunteer.userProfiles?.[0] as any)?.exitReasonNote;
          if (note) return note;
          const r = (volunteer.userProfiles?.[0] as any)?.exitReason ?? '';
          return r.startsWith('Autre:') ? r.slice('Autre:'.length).trim() : '';
        })(),
      };
    },
    [],
  );

  React.useEffect(() => {
    if (!volunteer) return;

    const ueList = volunteer.userEstablishments ?? [];
    const labelEntries = extractEstablishmentLabels(ueList);
    primeEstabLabelCache(labelEntries);

    const managedByFromApi = (volunteer as { managedById?: string | null }).managedById ?? '';
    const initialManagedById =
      hideCoordinatorField && authUser?.id ? authUser.id : managedByFromApi;
    const establishmentIds = ueList.map((ue) => ue.establishmentId).filter(Boolean);
    const stored = resolveStoredContact(volunteer.email ?? null, volunteer.phone ?? null);

    const initialData = buildInitialFormData(
      volunteer,
      initialManagedById,
      establishmentIds,
      stored,
    );

    setFormData(initialData);
    setPhoneCountryCode(stored.isoCode);
    validation.validateInitialFormData(initialData);
  }, [
    volunteer,
    hideCoordinatorField,
    authUser?.id,
    primeEstabLabelCache,
    extractEstablishmentLabels,
    buildInitialFormData,
  ]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateVolunteerDto) => updateVolunteer(volunteerId, dto),
    onSuccess: () => {
      const roleLabel = volunteer?.userRoles?.[0]?.role?.label || 'Volontaire';
      toast.success(`${roleLabel} modifié avec succès !`);
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification');
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'managedById' && value !== prev.managedById) {
        next.establishmentIds = [];
      }
      return next;
    });

    const updatedData =
      field === 'managedById' && value !== formData.managedById
        ? { ...formData, [field]: value, establishmentIds: [] as string[] }
        : { ...formData, [field]: value };

    if (field === 'phone') {
      validation.validateField(field, value, {
        ...updatedData,
        _phoneCountryCode: phoneCountryCode,
      });
    } else {
      validation.validateField(field, value, updatedData);
    }

    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm(formData);

    if (!isValid) {
      return;
    }

    const dto: UpdateVolunteerDto = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      displayName: formData.displayName || undefined,
      phone: formData.phone ? phoneToE164(formData.phone, phoneCountryCode) : undefined,
      status: formData.status as UserAccountStatus,
      roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined,
      managedById: effectiveManagedById || null,
      establishmentIds: formData.establishmentIds,
      subjects: formData.subjects.length > 0 ? formData.subjects : undefined,
      availability: formData.availability.weekly.length > 0 ? formData.availability : undefined,
      vscReportsFrequencies: formData.vscReportsFrequencies,
      engagementStartDate: formData.engagementStartDate || undefined,
      engagementEndDate: formData.engagementEndDate || undefined,
      gender: formData.gender || undefined,
      targetHours:
        (formData as any).targetHours !== '' ? Number((formData as any).targetHours) : undefined,
      exitReason: (formData as any).exitReason || undefined,
      exitReasonNote: (formData as any).exitReasonNote || undefined,
    };
    updateMutation.mutate(dto);
  };

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.label,
  }));

  const volunteerRoleOptions = React.useMemo(
    () => buildCreatableRoleOptions(availableRoles, roles),
    [availableRoles, roles],
  );

  const isEmailUID = !!volunteer?.email;

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier un VSC"
      subtitle="Modifiez les informations du bénévole"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      <RegenerateInvitationButton
        userId={volunteerId}
        email={volunteer?.email}
        pendingActivation={volunteer?.pendingActivation}
      />

      <div className="form-section">
        <h4 className="form-section-title">
          <User className="w-4 h-4" />
          Informations personnelles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={formData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            placeholder="Ex: Marie"
            maxLength={100}
            required
            state={validation.getFieldState('firstName')}
            error={validation.getFieldError('firstName')}
          />
          <Input
            label="Nom"
            value={formData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Ex: Martin"
            maxLength={100}
            required
            state={validation.getFieldState('lastName')}
            error={validation.getFieldError('lastName')}
          />
          <Select
            label="Statut"
            value={formData.status}
            onChange={(value) => handleFieldChange('status', value)}
            onBlur={() => handleBlur('status')}
            options={[
              { value: 'active', label: 'Actif' },
              { value: 'deactivated', label: 'Désactivé' },
            ]}
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
          />
          {formData.status === 'deactivated' && (
            <>
              <Select
                label="Motif de sortie"
                value={(formData as any).exitReason ?? ''}
                onChange={(value) => handleFieldChange('exitReason' as any, value)}
                onBlur={() => handleBlur('exitReason' as any)}
                options={[
                  { value: "Fin d'engagement anticipé", label: "Fin d'engagement anticipé" },
                  {
                    value: 'Réaffectation dans une autre zone',
                    label: 'Réaffectation dans une autre zone',
                  },
                  { value: 'Ne donne pas suite', label: 'Ne donne pas suite' },
                  { value: 'Autre', label: 'Autre' },
                ]}
                placeholder="Sélectionnez un motif (optionnel)"
              />
              {(formData as any).exitReason === 'Autre' && (
                <Input
                  type="text"
                  label="Précision du motif"
                  value={(formData as any).exitReasonNote ?? ''}
                  onChange={(e) => handleFieldChange('exitReasonNote' as any, e.target.value)}
                  onBlur={() => handleBlur('exitReasonNote' as any)}
                  placeholder="Précisez le motif de sortie…"
                />
              )}
            </>
          )}
          <Select
            label="Genre"
            value={formData.gender}
            onChange={(value) => handleFieldChange('gender', value)}
            onBlur={() => handleBlur('gender')}
            options={[
              { value: 'M', label: 'Homme' },
              { value: 'F', label: 'Femme' },
            ]}
            placeholder="Sélectionner"
            required
            state={validation.getFieldState('gender')}
            error={validation.getFieldError('gender')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <SmartContactInput
            label="Contact principal (identifiant)"
            value=""
            onContactChange={() => {}}
            disabled
            initialStoredEmail={volunteer?.email ?? null}
            initialStoredPhone={volunteer?.phone ?? null}
            labelTooltip="Si vous souhaitez modifier le contact principal, supprimez l'utilisateur puis recréez-le."
          />
          {isEmailUID ? (
            <PhoneInput
              label="Numéro de téléphone (contact secondaire, optionnel)"
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              onCountryChange={(country) => setPhoneCountryCode(country.code)}
              countryCode={phoneCountryCode}
              state={validation.getFieldState('phone')}
              error={validation.getFieldError('phone')}
              helperText="Numéro de contact secondaire"
            />
          ) : (
            <Input
              type="text"
              label="Email (contact secondaire, optionnel)"
              value={formData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              icon={Mail}
              placeholder="Ex: contact@example.com"
              state={validation.getFieldState('email')}
              error={validation.getFieldError('email')}
              helperText="Email secondaire (le téléphone reste l'identifiant de connexion)"
            />
          )}
        </div>
      </div>

      {!isSingleRoleMode && (
        <div className="form-section">
          <h4 className="form-section-title">
            <UserCog className="w-4 h-4" />
            Rôle(s)
          </h4>
          <MultiSelect
            label="Rôles"
            placeholder="Sélectionner les rôles"
            options={volunteerRoleOptions}
            value={formData.roleIds}
            onChange={(values) => handleFieldChange('roleIds', values)}
            onBlur={() => handleBlur('roleIds')}
            maxVisibleTags={3}
            helperText="Sélectionnez les rôles du volontaire"
            state={validation.getFieldState('roleIds')}
            error={validation.getFieldError('roleIds')}
          />
        </div>
      )}

      {!hideCoordinatorField && (
        <div className="form-section">
          <h4 className="form-section-title">
            <Building2 className="w-4 h-4" />
            Coordinateur
          </h4>
          <Select
            label="Coordinateur superviseur"
            placeholder="Sélectionner un coordinateur"
            options={coordinators.map((c) => ({
              value: c.id,
              label: `${c.firstName} ${c.lastName}`,
            }))}
            value={formData.managedById}
            onChange={(value) => handleFieldChange('managedById', value)}
            helperText="Le coordinateur qui supervise ce VSC"
            state={validation.getFieldState('managedById')}
            error={validation.getFieldError('managedById')}
          />
        </div>
      )}

      <div className="form-section">
        <h4 className="form-section-title">
          <Building2 className="w-4 h-4" />
          Établissements
        </h4>
        <MultiSelect
          label="Établissements"
          placeholder="Rechercher un établissement..."
          options={getEstabOptions(formData.establishmentIds)}
          value={formData.establishmentIds}
          onChange={(values) => handleFieldChange('establishmentIds', values)}
          onBlur={() => handleBlur('establishmentIds')}
          onSearch={onEstabSearch}
          isSearchLoading={estabSearchLoading}
          searchPlaceholder="Rechercher un établissement..."
          minSearchLength={2}
          maxVisibleTags={2}
          showSelectAll={false}
          required
          helperText={
            effectiveManagedById
              ? ESTABLISHMENT_SEARCH_HINT
              : "Veuillez d'abord sélectionner un coordinateur"
          }
          state={validation.getFieldState('establishmentIds')}
          error={validation.getFieldError('establishmentIds')}
        />
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <BookOpen className="w-4 h-4" />
          Matières enseignées
        </h4>
        <MultiSelect
          label="Matières"
          placeholder="Sélectionnez les matières"
          options={subjectOptions}
          value={formData.subjects}
          onChange={(values) => handleFieldChange('subjects', values)}
          onBlur={() => handleBlur('subjects')}
          maxVisibleTags={3}
          helperText="Sélectionnez les matières que le VSC peut enseigner"
          state={validation.getFieldState('subjects')}
          error={validation.getFieldError('subjects')}
        />
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Clock className="w-4 h-4" />
          Disponibilités
        </h4>
        <AvailabilityGrid
          value={formData.availability}
          onChange={(value) => handleFieldChange('availability', value)}
          disabled={false}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Définissez les créneaux horaires hebdomadaires où le VSC est disponible
        </p>
      </div>

      {/* {SHOW_VSC_REPORTS_FREQUENCY_FORM_SECTION ? (
        <div className="form-section">
          <h4 className="form-section-title">
            <FileText className="w-4 h-4" />
            Configuration des rapports VSC
          </h4>
          <div className="space-y-4">
            <Checkbox
              label="Rapport journalier (tous les jours à 20h)"
              checked={formData.vscReportsFrequencies.daily}
              onCheckedChange={(checked: boolean) =>
                handleFieldChange('vscReportsFrequencies', {
                  ...formData.vscReportsFrequencies,
                  daily: checked,
                })
              }
            />
            <Checkbox
              label="Rapport hebdomadaire (dimanche à 20h)"
              checked={formData.vscReportsFrequencies.weekly}
              onCheckedChange={(checked: boolean) =>
                handleFieldChange('vscReportsFrequencies', {
                  ...formData.vscReportsFrequencies,
                  weekly: checked,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Les rapports automatiques seront générés selon la fréquence sélectionnée et
              contiendront les métriques de vos séances.
            </p>
          </div>
        </div>
      ) : null} */}

      <div className="form-section">
        <h4 className="form-section-title">
          <Calendar className="w-4 h-4" />
          Dates d'engagement
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <DateSplitInput
            label="Date de début de mission"
            required
            value={formData.engagementStartDate}
            onChange={(value) => handleFieldChange('engagementStartDate', value)}
            onBlur={() => handleBlur('engagementStartDate')}
            state={validation.getFieldState('engagementStartDate')}
            error={validation.getFieldError('engagementStartDate')}
          />
          <DateSplitInput
            label="Date de fin de contrat"
            required
            value={formData.engagementEndDate}
            onChange={(value) => handleFieldChange('engagementEndDate', value)}
            onBlur={() => handleBlur('engagementEndDate')}
            minDate={addDaysToDateString(formData.engagementStartDate, 1)}
            maxDate="2099-12-31"
            yearSortAsc
            state={validation.getFieldState('engagementEndDate')}
            error={validation.getFieldError('engagementEndDate')}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Définissez la période d'engagement du VSC
        </p>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Input
            type="number"
            label="Nombre d'heures à réaliser"
            value={
              (formData as any).targetHours === ''
                ? ''
                : String((formData as any).targetHours ?? '')
            }
            onChange={(e) => {
              const raw = e.target.value;
              handleFieldChange('targetHours' as any, raw === '' ? '' : Number(raw));
            }}
            onBlur={() => handleBlur('targetHours' as any)}
            placeholder="Ex: 50"
            min={0}
          />
        </div>
      </div>
    </SlidePanelForm>
  );
};
