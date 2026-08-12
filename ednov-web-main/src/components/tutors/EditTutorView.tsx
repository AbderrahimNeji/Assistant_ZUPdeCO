import * as React from 'react';
import {
  Mail,
  BookOpen,
  Clock,
  User,
  Calendar,
  Building2,
  GraduationCap,
  UserCog,
  Target,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AvailabilityGrid } from '@/components/forms/AvailabilityGrid';
import { DateSplitInput } from '@/components/forms/DateSplitInput';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { RegenerateInvitationButton } from '@/components/common/RegenerateInvitationButton';
import { toast } from '@/lib/toast';
import { getTutor, getRoles } from '@/services/users.service';
import { updateTutor } from '@/services/tutors.service';
import { getSubjects, getSchoolClasses } from '@/services/academic.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useEnrichEstablishmentLabels } from '@/hooks/useEnrichEstablishmentLabels';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { getEditableRoles } from '@/utils/interface-hierarchy';
import { buildCreatableRoleOptions } from '@/utils/creatable-role-options';
import {
  PROFESSIONAL_SITUATION_OPTIONS,
  type ProfessionalSituation,
  type UpdateTutorDto,
} from '@/types/tutor.types';
import { normalizeStaffAccountStatus, type UserAccountStatus } from '@/types/user.types';
import type { AvailabilitySlot } from '@/components/forms/AvailabilityGrid';
import { useFormValidation } from '@/hooks/useFormValidation';
import { tutorEditValidationSchema } from '@/utils/validation-schemas';
import { resolveStoredContact, phoneToE164 } from '@/utils/phone-contact-utils';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { addDaysToDateString } from '@/lib/date-utils';

interface EditTutorViewProps {
  tutorId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditTutorView: React.FC<EditTutorViewProps> = ({ tutorId, onClose, onSuccess }) => {
  const defaultCountry = useDefaultPhoneCountry();
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<string>(defaultCountry);
  const { elements: tutorElements = [] } = useInterfaceElements('tutors');
  const availableRoles = React.useMemo(() => getEditableRoles(tutorElements), [tutorElements]);
  const isSingleRoleMode = availableRoles.length <= 1;

  const [formData, setFormData] = React.useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    email?: string;
    phone?: string;
    status: string;
    roleIds: string[];
    establishmentIds: string[];
    subjects: string[];
    schoolClassId: string;
    availability: { weekly: AvailabilitySlot[] };
    engagementStartDate: string;
    engagementEndDate: string;
    professionalSituation: '' | ProfessionalSituation;
    gender: 'M' | 'F' | 'O' | '';
    targetHours: '' | number;
  }>({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    status: 'active',
    roleIds: [],
    establishmentIds: [],
    subjects: [],
    schoolClassId: '',
    availability: { weekly: [] },
    engagementStartDate: '',
    engagementEndDate: '',
    professionalSituation: '',
    gender: '',
    targetHours: '',
  });

  const validation = useFormValidation(tutorEditValidationSchema);

  const { data: tutor, isLoading } = useQuery({
    queryKey: ['tutors', tutorId],
    queryFn: () => getTutor(tutorId),
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

  const tutorEstablishmentId = formData.establishmentIds[0];

  const { data: tutorClassesRes } = useQuery({
    queryKey: ['school-classes', tutorEstablishmentId],
    queryFn: () =>
      getSchoolClasses({ establishmentId: tutorEstablishmentId || undefined, pageSize: 200 }),
    enabled: !!tutorEstablishmentId,
    staleTime: 5 * 60 * 1000,
  });
  const tutorClasses = tutorClassesRes?.data ?? [];

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
    primeLabelCache: primeEstabLabelCache,
  } = useEstablishmentsMultiselect();

  useEnrichEstablishmentLabels(formData.establishmentIds, primeEstabLabelCache);

  React.useEffect(() => {
    if (tutor) {
      const ueList = tutor.userEstablishments ?? [];
      const labelEntries: Array<{ id: string; name: string }> = [];
      for (const ue of ueList) {
        const id = ue.establishmentId;
        const name = ue.establishment?.name?.trim();
        if (id && name) labelEntries.push({ id, name });
      }
      primeEstabLabelCache(labelEntries);

      // Résoudre le contact principal et le téléphone secondaire
      const stored = resolveStoredContact(tutor.email ?? null, tutor.phone ?? null);

      const dateDebut = tutor.userProfiles?.[0]?.engagementStartDate;
      const dateFin = tutor.userProfiles?.[0]?.engagementEndDate;
      const establishmentIds = ueList.map((ue) => ue.establishmentId).filter(Boolean);

      const initialData = {
        firstName: tutor.firstName || '',
        lastName: tutor.lastName || '',
        displayName: tutor.displayName || '',
        // Pour le phone éditable séparé, utiliser la valeur localisée si identifiant principal est phone
        phone: stored.mode === 'phone' ? stored.displayValue : tutor.phone || '',
        status: normalizeStaffAccountStatus(String(tutor.status)),
        roleIds: tutor.userRoles?.map((ur) => ur.roleId) || [],

        establishmentIds,
        subjects: (tutor.userProfiles?.[0]?.subjects || []) as string[],
        schoolClassId: (tutor.userProfiles?.[0] as any)?.schoolClassId || '',
        availability: (tutor.userProfiles?.[0]?.availability as { weekly: AvailabilitySlot[] }) || {
          weekly: [],
        },
        engagementStartDate: dateDebut ? new Date(dateDebut).toISOString().split('T')[0] : '',
        engagementEndDate: dateFin ? new Date(dateFin).toISOString().split('T')[0] : '',
        professionalSituation: (() => {
          const v = tutor.userProfiles?.[0]?.professionalSituation;
          if (v === 'employee' || v === 'student' || v === 'retired') return v;
          return '' as const;
        })(),
        gender: (() => {
          const g = tutor.userProfiles?.[0]?.gender;
          return (g === 'M' || g === 'F' || g === 'O' ? g : '') as 'M' | 'F' | 'O' | '';
        })(),
        targetHours: (() => {
          const h = tutor.userProfiles?.[0]?.targetHours;
          return (h != null ? Number(h) : '') as '' | number;
        })(),
        exitReason: (() => {
          const r = (tutor.userProfiles?.[0] as any)?.exitReason ?? '';
          // Normalize legacy "Autre: {note}" format → "Autre"
          return r.startsWith('Autre:') ? 'Autre' : r;
        })(),
        exitReasonNote: (() => {
          // Prefer dedicated DB column; fall back to legacy "Autre: {note}" parsing
          const note = (tutor.userProfiles?.[0] as any)?.exitReasonNote;
          if (note) return note;
          const r = (tutor.userProfiles?.[0] as any)?.exitReason ?? '';
          return r.startsWith('Autre:') ? r.slice('Autre:'.length).trim() : '';
        })(),
      };

      setFormData(initialData);
      setPhoneCountryCode(stored.isoCode);
      validation.validateInitialFormData(initialData);
    }
  }, [tutor, primeEstabLabelCache]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateTutorDto) => updateTutor(tutorId, dto),
    onSuccess: () => {
      const roleLabel = tutor?.userRoles?.[0]?.role?.label || 'Tuteur';
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...formData, [field]: value };

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

    const dto: UpdateTutorDto = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      displayName: formData.displayName || undefined,
      phone: formData.phone ? phoneToE164(formData.phone, phoneCountryCode) : undefined,
      status: formData.status as UserAccountStatus,
      roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined,
      establishmentIds: formData.establishmentIds,
      subjects: formData.subjects.length > 0 ? formData.subjects : undefined,
      schoolClassId: formData.schoolClassId || null,
      availability: formData.availability.weekly.length > 0 ? formData.availability : undefined,
      engagementStartDate: formData.engagementStartDate || undefined,
      engagementEndDate: formData.engagementEndDate || undefined,
      ...(formData.professionalSituation
        ? { professionalSituation: formData.professionalSituation }
        : {}),
      gender: formData.gender || undefined,
      targetHours: formData.targetHours !== '' ? Number(formData.targetHours) : undefined,
      exitReason: (formData as any).exitReason || undefined,
      exitReasonNote: (formData as any).exitReasonNote || undefined,
    } satisfies Partial<UpdateTutorDto> as UpdateTutorDto;
    updateMutation.mutate(dto);
  };

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.label,
  }));

  const tutorRoleOptions = React.useMemo(
    () => buildCreatableRoleOptions(availableRoles, roles),
    [availableRoles, roles],
  );

  const isEmailUID = !!tutor?.email;

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier un tuteur"
      subtitle="Modifiez les informations du tuteur"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      <RegenerateInvitationButton
        userId={tutorId}
        email={tutor?.email}
        pendingActivation={tutor?.pendingActivation}
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
            state={validation.getFieldState('lastName')}
            error={validation.getFieldError('lastName')}
          />
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
            label="Situation professionnelle"
            value={formData.professionalSituation}
            onChange={(value) => handleFieldChange('professionalSituation', value)}
            onBlur={() => handleBlur('professionalSituation')}
            options={PROFESSIONAL_SITUATION_OPTIONS}
            placeholder="Sélectionnez une situation"
            state={validation.getFieldState('professionalSituation')}
            error={validation.getFieldError('professionalSituation')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <SmartContactInput
            label="Contact principal (identifiant)"
            value=""
            onContactChange={() => {}}
            disabled
            initialStoredEmail={tutor?.email ?? null}
            initialStoredPhone={tutor?.phone ?? null}
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
            options={tutorRoleOptions}
            value={formData.roleIds}
            onChange={(values) => handleFieldChange('roleIds', values)}
            onBlur={() => handleBlur('roleIds')}
            maxVisibleTags={3}
            helperText="Sélectionnez les rôles du tuteur"
            state={validation.getFieldState('roleIds')}
            error={validation.getFieldError('roleIds')}
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
          helperText={ESTABLISHMENT_SEARCH_HINT}
          required
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
          helperText="Sélectionnez les matières que le tuteur peut enseigner"
          state={validation.getFieldState('subjects')}
          error={validation.getFieldError('subjects')}
        />
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <GraduationCap className="w-4 h-4" />
          Classe
        </h4>
        <Select
          label="Classe (optionnel)"
          value={formData.schoolClassId}
          onChange={(value) => handleFieldChange('schoolClassId', value)}
          onBlur={() => handleBlur('schoolClassId')}
          options={tutorClasses.map((sc) => ({ value: sc.id, label: sc.name }))}
          placeholder={
            !tutorEstablishmentId
              ? "Sélectionnez d'abord un établissement"
              : tutorClasses.length === 0
                ? 'Aucune classe disponible'
                : 'Sélectionner une classe (optionnel)'
          }
          disabled={!tutorEstablishmentId}
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
          maxVisibleRows={10}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Définissez les créneaux horaires hebdomadaires où le tuteur est disponible
        </p>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Calendar className="w-4 h-4" />
          Dates d'engagement
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <DateSplitInput
            label="Date début engagement"
            required
            value={formData.engagementStartDate}
            onChange={(value) => handleFieldChange('engagementStartDate', value)}
            onBlur={() => handleBlur('engagementStartDate')}
            state={validation.getFieldState('engagementStartDate')}
            error={validation.getFieldError('engagementStartDate')}
          />
          <DateSplitInput
            label="Date fin engagement"
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
          Définissez la période d'engagement du tuteur
        </p>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Target className="w-4 h-4" />
          Objectifs
        </h4>
        <Input
          type="number"
          label="Nombre d'heures à réaliser"
          value={formData.targetHours === '' ? '' : String(formData.targetHours)}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange('targetHours', raw === '' ? '' : Number(raw));
          }}
          onBlur={() => handleBlur('targetHours')}
          placeholder="Ex : 40"
          min={0}
          helperText="Objectif d'heures de tutorat à réaliser (optionnel)"
          state={validation.getFieldState('targetHours')}
          error={validation.getFieldError('targetHours')}
        />
      </div>
    </SlidePanelForm>
  );
};
