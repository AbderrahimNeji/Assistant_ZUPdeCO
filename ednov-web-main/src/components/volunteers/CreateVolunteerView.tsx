import * as React from 'react';
import { User, BookOpen, Clock, FileText, Building2, Calendar, Mail, UserCog } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AvailabilityGrid } from '@/components/forms/AvailabilityGrid';
import { Checkbox } from '@/components/forms/Checkbox';
import { DateSplitInput } from '@/components/forms/DateSplitInput';
import { useFormValidation } from '@/hooks/useFormValidation';
import { volunteerCreateValidationSchema } from '@/utils/validation-schemas';
import { createVolunteer } from '@/services/volunteers.service';
import { getRoles, getCoordinators } from '@/services/users.service';
import { getSubjects } from '@/services/academic.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { getCreatableRoles } from '@/utils/interface-hierarchy';
import { buildCreatableRoleOptions } from '@/utils/creatable-role-options';
import { findRoleByCode } from '@/utils/find-role-by-code';
import type { CreateVolunteerDto } from '@/types/volunteer.types';
import type { AvailabilitySlot } from '@/components/forms/AvailabilityGrid';
import { toast } from '@/lib/toast';
import { phoneToE164 } from '@/utils/phone-contact-utils';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { useAuthStore } from '@/stores/authStore';
import { addDaysToDateString } from '@/lib/date-utils';
import { SHOW_VSC_REPORTS_FREQUENCY_FORM_SECTION } from '@/components/volunteers/volunteer-configs';

interface CreateVolunteerViewProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialRole?: string;
}

export const CreateVolunteerView: React.FC<CreateVolunteerViewProps> = ({
  onClose,
  onSuccess,
  initialRole,
}) => {
  const user = useAuthStore((s) => s.user);
  const authRoles = useAuthStore((s) => s.roles);

  const hideCoordinatorField =
    authRoles.some((r) => r.code.toLowerCase() === 'coordinator') &&
    !authRoles.some((r) => ['admin', 'manager'].includes(r.code.toLowerCase()));

  const validation = useFormValidation(volunteerCreateValidationSchema);
  const defaultCountry = useDefaultPhoneCountry();

  const { elements: volunteerElements = [] } = useInterfaceElements('volunteers');
  const availableRoles = React.useMemo(
    () => getCreatableRoles(volunteerElements),
    [volunteerElements],
  );
  const isSingleRoleMode = availableRoles.length <= 1;

  const [volunteerData, setVolunteerData] = React.useState({
    contact: '',
    contactType: 'unknown' as 'email' | 'phone' | 'unknown',
    contactCountryCode: defaultCountry,
    secondaryContact: '',
    secondaryContactCountryCode: defaultCountry,
    firstName: '',
    lastName: '',
    displayName: '',
    gender: '' as 'M' | 'F' | 'O' | '',
    roleIds: [] as string[],
    establishmentIds: [] as string[],
    managedById: '',
    subjects: [] as string[],
    availability: {
      weekly: [] as AvailabilitySlot[],
    },
    vscReportsFrequencies: {
      daily: false,
      weekly: false,
    },
    engagementStartDate: new Date().toISOString().split('T')[0],
    engagementEndDate: '',
    status: 'active',
    targetHours: '' as '' | number,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  React.useEffect(() => {
    validation.validateInitialFormData(volunteerData);
    // Intentionnellement uniquement au montage : évalue les valeurs pré-remplies
    // (ex. engagementStartDate = aujourd'hui) sans bloquer le bouton Créer.
  }, []);

  React.useEffect(() => {
    if (initialRole && roles.length > 0) {
      const matchingRole = findRoleByCode(roles, initialRole);
      if (matchingRole) {
        const newRoleIds = [matchingRole.id];
        setVolunteerData((prev) => ({ ...prev, roleIds: newRoleIds }));
        validation.validateField('roleIds', newRoleIds, {
          ...volunteerData,
          roleIds: newRoleIds,
        });
      }
    }

    if (isSingleRoleMode && availableRoles.length === 1 && volunteerData.roleIds.length === 0) {
      const matchingRole = findRoleByCode(roles, availableRoles[0].value);
      if (matchingRole) {
        const newRoleIds = [matchingRole.id];
        setVolunteerData((prev) => ({ ...prev, roleIds: newRoleIds }));
        validation.validateField('roleIds', newRoleIds, {
          ...volunteerData,
          roleIds: newRoleIds,
        });
      }
    }
  }, [initialRole, roles, isSingleRoleMode, availableRoles, volunteerData.roleIds.length]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
  });

  const effectiveManagedById =
    hideCoordinatorField && user?.id ? user.id : volunteerData.managedById;

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
  } = useEstablishmentsMultiselect();

  const { data: coordinatorsResponse } = useQuery({
    queryKey: ['coordinators'],
    queryFn: () => getCoordinators({ pageSize: 100 }),
    enabled: !hideCoordinatorField,
  });
  const coordinators = coordinatorsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateVolunteerDto) => createVolunteer(dto),
    onSuccess: () => {
      const roleLabel = roles.find((r) => r.id === volunteerData.roleIds[0])?.label || 'Volontaire';
      toast.success(`${roleLabel} créé avec succès !`);
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const handleFieldChange = (field: keyof typeof volunteerData, value: any) => {
    setVolunteerData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'managedById' && value !== prev.managedById) {
        updated.establishmentIds = [];
      }
      return updated;
    });

    const updatedData = { ...volunteerData, [field]: value };

    if (field === 'contact') {
      validation.validateField(field, value, {
        ...updatedData,
        _contactType: volunteerData.contactType,
        _phoneCountryCode: volunteerData.contactCountryCode,
      });
    } else {
      validation.validateField(field, value, updatedData);
    }

    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleContactChange = (
    value: string,
    type: 'email' | 'phone' | 'unknown',
    countryCode?: string,
  ) => {
    // Détecter si le type change pour reset le contact secondaire
    const typeChanged =
      type !== 'unknown' &&
      volunteerData.contactType !== 'unknown' &&
      type !== volunteerData.contactType;

    setVolunteerData((prev) => ({
      ...prev,
      contact: value,
      contactType: type,
      contactCountryCode: countryCode || prev.contactCountryCode,
      // Reset secondaire si type change
      secondaryContact: typeChanged ? '' : prev.secondaryContact,
      secondaryContactCountryCode: typeChanged ? defaultCountry : prev.secondaryContactCountryCode,
    }));

    validation.validateField('contact', value, {
      ...volunteerData,
      contact: value,
      _contactType: type,
      _phoneCountryCode: countryCode || volunteerData.contactCountryCode,
    });

    validation.markAsTouched('contact');
    validation.markAsDirty('contact');
  };

  const handleSecondaryContactChange = (value: string) => {
    setVolunteerData((prev) => ({ ...prev, secondaryContact: value }));

    validation.validateField('secondaryContact', value, {
      ...volunteerData,
      secondaryContact: value,
      _contactType: volunteerData.contactType,
    });

    validation.markAsTouched('secondaryContact');
    validation.markAsDirty('secondaryContact');
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm({
      ...volunteerData,
      _contactType: volunteerData.contactType,
      _phoneCountryCode: volunteerData.contactCountryCode,
    });

    if (!isValid) {
      return;
    }

    // Dériver inviteBy du type de contact
    const inviteBy = volunteerData.contactType === 'email' ? 'email' : 'phone';

    let phone: string | undefined;
    if (volunteerData.contactType === 'phone') {
      phone = phoneToE164(volunteerData.contact, volunteerData.contactCountryCode);
    } else if (volunteerData.secondaryContact?.trim()) {
      phone = phoneToE164(
        volunteerData.secondaryContact,
        volunteerData.secondaryContactCountryCode,
      );
    } else {
      phone = undefined;
    }

    const dto: CreateVolunteerDto = {
      inviteBy,
      email:
        volunteerData.contactType === 'email'
          ? volunteerData.contact
          : volunteerData.secondaryContact?.trim() || undefined,
      firstName: volunteerData.firstName,
      lastName: volunteerData.lastName,
      phone,
      roleIds: volunteerData.roleIds,
      establishmentIds: volunteerData.establishmentIds,
      managedById: effectiveManagedById || null,
      subjects: volunteerData.subjects.length > 0 ? volunteerData.subjects : undefined,
      availability:
        volunteerData.availability.weekly.length > 0 ? volunteerData.availability : undefined,
      vscReportsFrequencies: volunteerData.vscReportsFrequencies,
      engagementStartDate: volunteerData.engagementStartDate || undefined,
      engagementEndDate: volunteerData.engagementEndDate || undefined,
      gender: volunteerData.gender || undefined,
      targetHours:
        (volunteerData as any).targetHours !== ''
          ? Number((volunteerData as any).targetHours)
          : undefined,
    };
    createMutation.mutate(dto);
  };

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.label,
  }));

  const volunteerRoleOptions = React.useMemo(
    () => buildCreatableRoleOptions(availableRoles, roles),
    [availableRoles, roles],
  );

  const isSubmitting = createMutation.isPending;

  return (
    <SlidePanelForm
      formType="create"
      title="Créer un volontaire"
      subtitle="Renseignez les informations du volontaire"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={validation.isFormValid()}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <User className="w-4 h-4" />
          Informations personnelles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={volunteerData.firstName}
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
            value={volunteerData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Ex: Martin"
            maxLength={100}
            required
            state={validation.getFieldState('lastName')}
            error={validation.getFieldError('lastName')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Select
            label="Genre"
            value={volunteerData.gender}
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
          <SmartContactInput
            label="Contact"
            value={volunteerData.contact}
            onContactChange={handleContactChange}
            onBlur={() => handleBlur('contact')}
            required
            state={validation.getFieldState('contact')}
            error={validation.getFieldError('contact')}
            helperText="Saisissez l'email ou le numéro de téléphone du VSC"
          />
          {volunteerData.contactType !== 'unknown' && (
            <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              {volunteerData.contactType === 'email' ? (
                <PhoneInput
                  label="Téléphone (contact secondaire, optionnel)"
                  value={volunteerData.secondaryContact}
                  onChange={(e) => handleSecondaryContactChange(e.target.value)}
                  onBlur={() => handleBlur('secondaryContact')}
                  countryCode={volunteerData.secondaryContactCountryCode}
                  onCountryChange={(c) =>
                    setVolunteerData((p) => ({ ...p, secondaryContactCountryCode: c.code }))
                  }
                  state={validation.getFieldState('secondaryContact')}
                  error={validation.getFieldError('secondaryContact')}
                  helperText="Numéro secondaire pour joindre ce VSC"
                />
              ) : (
                <Input
                  type="text"
                  label="Email (contact secondaire, optionnel)"
                  value={volunteerData.secondaryContact}
                  onChange={(e) => handleSecondaryContactChange(e.target.value)}
                  onBlur={() => handleBlur('secondaryContact')}
                  icon={Mail}
                  placeholder="Ex: contact@example.com"
                  state={validation.getFieldState('secondaryContact')}
                  error={validation.getFieldError('secondaryContact')}
                  helperText="Email secondaire pour joindre ce VSC"
                />
              )}
            </div>
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
            value={volunteerData.roleIds}
            onChange={(values) => handleFieldChange('roleIds', values)}
            onBlur={() => handleBlur('roleIds')}
            helperText={
              initialRole
                ? 'Le rôle est pré-sélectionné'
                : 'Sélectionnez le rôle à créer (VSC, professeur, etc.)'
            }
            required
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
            value={volunteerData.managedById}
            onChange={(value) => handleFieldChange('managedById', value)}
            helperText="Le coordinateur qui supervisera ce VSC"
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
          options={getEstabOptions(volunteerData.establishmentIds)}
          value={volunteerData.establishmentIds}
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
          value={volunteerData.subjects}
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
          value={volunteerData.availability}
          onChange={(value) => handleFieldChange('availability', value)}
          disabled={false}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Définissez les créneaux horaires hebdomadaires où le VSC est disponible
        </p>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Calendar className="w-4 h-4" />
          Dates d'engagement
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <DateSplitInput
            label="Date de début de mission"
            required
            value={volunteerData.engagementStartDate}
            onChange={(value) => handleFieldChange('engagementStartDate', value)}
            onBlur={() => handleBlur('engagementStartDate')}
            state={validation.getFieldState('engagementStartDate')}
            error={validation.getFieldError('engagementStartDate')}
          />
          <DateSplitInput
            label="Date de fin de contrat"
            required
            value={volunteerData.engagementEndDate}
            onChange={(value) => handleFieldChange('engagementEndDate', value)}
            onBlur={() => handleBlur('engagementEndDate')}
            minDate={addDaysToDateString(volunteerData.engagementStartDate, 1)}
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
              (volunteerData as any).targetHours === ''
                ? ''
                : String((volunteerData as any).targetHours ?? '')
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
