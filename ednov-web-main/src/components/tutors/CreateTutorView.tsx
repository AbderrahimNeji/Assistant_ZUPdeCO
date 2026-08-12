import * as React from 'react';
import { BookOpen, Clock, User, Building2, Calendar, Mail, UserCog, Target } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AvailabilityGrid } from '@/components/forms/AvailabilityGrid';
import { DateSplitInput } from '@/components/forms/DateSplitInput';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { useFormValidation } from '@/hooks/useFormValidation';
import { tutorCreateValidationSchema } from '@/utils/validation-schemas';
import { createTutor } from '@/services/tutors.service';
import { getRoles } from '@/services/users.service';
import { getSubjects } from '@/services/academic.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { getCreatableRoles } from '@/utils/interface-hierarchy';
import { buildCreatableRoleOptions } from '@/utils/creatable-role-options';
import { findRoleByCode } from '@/utils/find-role-by-code';
import {
  PROFESSIONAL_SITUATION_OPTIONS,
  type CreateTutorDto,
  type ProfessionalSituation,
} from '@/types/tutor.types';
import type { AvailabilitySlot } from '@/components/forms/AvailabilityGrid';
import type { UserWithProfile } from '@/types/user.types';
import { tutorToUserWithProfile } from '@/utils/created-user-profile';
import { toast } from '@/lib/toast';
import { phoneToE164 } from '@/utils/phone-contact-utils';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { addDaysToDateString } from '@/lib/date-utils';

interface CreateTutorViewProps {
  onClose: () => void;
  /** Utilisateur créé (profil UI) — permet l’ajout immédiat à une séance / matching. */
  onSuccess?: (created: UserWithProfile) => void;
  initialRole?: string;
}

export const CreateTutorView: React.FC<CreateTutorViewProps> = ({
  onClose,
  onSuccess,
  initialRole,
}) => {
  const validation = useFormValidation(tutorCreateValidationSchema);
  const defaultCountry = useDefaultPhoneCountry();

  const { elements: tutorElements = [] } = useInterfaceElements('tutors');
  const availableRoles = React.useMemo(() => getCreatableRoles(tutorElements), [tutorElements]);
  const isSingleRoleMode = availableRoles.length <= 1;

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

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
  } = useEstablishmentsMultiselect();

  const [tutorData, setTutorData] = React.useState({
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
    subjects: [] as string[],
    availability: {
      weekly: [] as AvailabilitySlot[],
    },
    engagementStartDate: new Date().toISOString().split('T')[0],
    engagementEndDate: '',
    status: 'active',
    professionalSituation: '' as '' | ProfessionalSituation,
    targetHours: '' as '' | number,
  });

  React.useEffect(() => {
    validation.validateInitialFormData(tutorData);
    // Intentionnellement uniquement au montage : évalue les valeurs pré-remplies
    // (ex. engagementStartDate = aujourd'hui) sans bloquer le bouton Créer.
  }, []);

  React.useEffect(() => {
    if (initialRole && roles.length > 0) {
      const matchingRole = findRoleByCode(roles, initialRole);
      if (matchingRole) {
        const newRoleIds = [matchingRole.id];
        setTutorData((prev) => ({ ...prev, roleIds: newRoleIds }));
        validation.validateField('roleIds', newRoleIds, {
          ...tutorData,
          roleIds: newRoleIds,
        });
      }
    }

    if (isSingleRoleMode && availableRoles.length === 1 && tutorData.roleIds.length === 0) {
      const matchingRole = findRoleByCode(roles, availableRoles[0].value);
      if (matchingRole) {
        const newRoleIds = [matchingRole.id];
        setTutorData((prev) => ({ ...prev, roleIds: newRoleIds }));
        validation.validateField('roleIds', newRoleIds, {
          ...tutorData,
          roleIds: newRoleIds,
        });
      }
    }
  }, [initialRole, roles, isSingleRoleMode, availableRoles, tutorData.roleIds.length]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateTutorDto) => createTutor(dto),
    onSuccess: (created) => {
      const roleLabel = roles.find((r) => r.id === tutorData.roleIds[0])?.label || 'Tuteur';
      toast.success(`${roleLabel} créé avec succès !`);
      onSuccess?.(tutorToUserWithProfile(created));
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const handleFieldChange = (field: keyof typeof tutorData, value: any) => {
    setTutorData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...tutorData, [field]: value };

    if (field === 'contact') {
      // Passer aussi _contactType et _phoneCountryCode pour la validation
      validation.validateField(field, value, {
        ...updatedData,
        _contactType: tutorData.contactType,
        _phoneCountryCode: tutorData.contactCountryCode,
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
      type !== 'unknown' && tutorData.contactType !== 'unknown' && type !== tutorData.contactType;

    setTutorData((prev) => ({
      ...prev,
      contact: value,
      contactType: type,
      contactCountryCode: countryCode || prev.contactCountryCode,
      // Reset secondaire si type change
      secondaryContact: typeChanged ? '' : prev.secondaryContact,
      secondaryContactCountryCode: typeChanged ? defaultCountry : prev.secondaryContactCountryCode,
    }));

    // Validation avec contexte
    validation.validateField('contact', value, {
      ...tutorData,
      contact: value,
      _contactType: type,
      _phoneCountryCode: countryCode || tutorData.contactCountryCode,
    });

    validation.markAsTouched('contact');
    validation.markAsDirty('contact');
  };

  const handleSecondaryContactChange = (value: string) => {
    setTutorData((prev) => ({ ...prev, secondaryContact: value }));

    validation.validateField('secondaryContact', value, {
      ...tutorData,
      secondaryContact: value,
      _contactType: tutorData.contactType,
    });

    validation.markAsTouched('secondaryContact');
    validation.markAsDirty('secondaryContact');
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm({
      ...tutorData,
      _contactType: tutorData.contactType,
      _phoneCountryCode: tutorData.contactCountryCode,
    });

    if (!isValid) {
      return;
    }

    // Dériver inviteBy du type de contact
    const inviteBy = tutorData.contactType === 'email' ? 'email' : 'phone';

    let phone: string | undefined;
    if (tutorData.contactType === 'phone') {
      phone = phoneToE164(tutorData.contact, tutorData.contactCountryCode);
    } else if (tutorData.secondaryContact?.trim()) {
      phone = phoneToE164(tutorData.secondaryContact, tutorData.secondaryContactCountryCode);
    } else {
      phone = undefined;
    }

    const dto: CreateTutorDto = {
      inviteBy,
      email:
        tutorData.contactType === 'email'
          ? tutorData.contact
          : tutorData.secondaryContact?.trim() || undefined,
      firstName: tutorData.firstName,
      lastName: tutorData.lastName,
      phone,
      roleIds: tutorData.roleIds,
      establishmentIds: tutorData.establishmentIds,
      subjects: tutorData.subjects.length > 0 ? tutorData.subjects : undefined,
      availability: tutorData.availability.weekly.length > 0 ? tutorData.availability : undefined,
      engagementStartDate: tutorData.engagementStartDate || undefined,
      engagementEndDate: tutorData.engagementEndDate || undefined,
      professionalSituation: tutorData.professionalSituation as ProfessionalSituation,
      gender: tutorData.gender || undefined,
      targetHours: tutorData.targetHours !== '' ? Number(tutorData.targetHours) : undefined,
    };
    createMutation.mutate(dto);
  };

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.label,
  }));

  const tutorRoleOptions = React.useMemo(
    () => buildCreatableRoleOptions(availableRoles, roles),
    [availableRoles, roles],
  );

  const isSubmitting = createMutation.isPending;

  return (
    <SlidePanelForm
      formType="create"
      title="Créer un tuteur"
      subtitle="Renseignez les informations du bénévole"
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
            value={tutorData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            placeholder="Ex: Marie"
            maxLength={100}
            state={validation.getFieldState('firstName')}
            error={validation.getFieldError('firstName')}
          />
          <Input
            label="Nom"
            value={tutorData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Ex: Martin"
            maxLength={100}
            state={validation.getFieldState('lastName')}
            error={validation.getFieldError('lastName')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Select
            label="Genre"
            value={tutorData.gender}
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
            label="Situation professionnelle"
            value={tutorData.professionalSituation}
            onChange={(value) => handleFieldChange('professionalSituation', value)}
            onBlur={() => handleBlur('professionalSituation')}
            options={PROFESSIONAL_SITUATION_OPTIONS}
            placeholder="Sélectionnez une situation"
            required
            state={validation.getFieldState('professionalSituation')}
            error={validation.getFieldError('professionalSituation')}
          />
          <SmartContactInput
            label="Contact"
            value={tutorData.contact}
            onContactChange={handleContactChange}
            onBlur={() => handleBlur('contact')}
            required
            state={validation.getFieldState('contact')}
            error={validation.getFieldError('contact')}
            helperText="Saisissez l'email ou le numéro de téléphone du tuteur"
          />
          {tutorData.contactType !== 'unknown' && (
            <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              {tutorData.contactType === 'email' ? (
                <PhoneInput
                  label="Téléphone (contact secondaire, optionnel)"
                  value={tutorData.secondaryContact}
                  onChange={(e) => handleSecondaryContactChange(e.target.value)}
                  onBlur={() => handleBlur('secondaryContact')}
                  countryCode={tutorData.secondaryContactCountryCode}
                  onCountryChange={(c) =>
                    setTutorData((p) => ({ ...p, secondaryContactCountryCode: c.code }))
                  }
                  state={validation.getFieldState('secondaryContact')}
                  error={validation.getFieldError('secondaryContact')}
                  helperText="Numéro secondaire pour joindre ce tuteur"
                />
              ) : (
                <Input
                  type="text"
                  label="Email (contact secondaire, optionnel)"
                  value={tutorData.secondaryContact}
                  onChange={(e) => handleSecondaryContactChange(e.target.value)}
                  onBlur={() => handleBlur('secondaryContact')}
                  icon={Mail}
                  placeholder="Ex: contact@example.com"
                  state={validation.getFieldState('secondaryContact')}
                  error={validation.getFieldError('secondaryContact')}
                  helperText="Email secondaire pour joindre ce tuteur"
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
            options={tutorRoleOptions}
            value={tutorData.roleIds}
            onChange={(values) => handleFieldChange('roleIds', values)}
            onBlur={() => handleBlur('roleIds')}
            helperText={
              initialRole
                ? 'Le rôle est pré-sélectionné'
                : 'Sélectionnez le rôle à créer (tuteur, etc.)'
            }
            required
            state={validation.getFieldState('roleIds')}
            error={validation.getFieldError('roleIds')}
          />
        </div>
      )}

      <div className="form-section">
        <h4 className="form-section-title">
          <Building2 className="w-4 h-4" />
          Établissement
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <MultiSelect
            label="Établissements"
            placeholder="Rechercher un établissement..."
            options={getEstabOptions(tutorData.establishmentIds)}
            value={tutorData.establishmentIds}
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
          value={tutorData.subjects}
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
          <Clock className="w-4 h-4" />
          Disponibilités
        </h4>
        <AvailabilityGrid
          value={tutorData.availability}
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
            value={tutorData.engagementStartDate}
            onChange={(value) => handleFieldChange('engagementStartDate', value)}
            onBlur={() => handleBlur('engagementStartDate')}
            state={validation.getFieldState('engagementStartDate')}
            error={validation.getFieldError('engagementStartDate')}
          />
          <DateSplitInput
            label="Date fin engagement"
            required
            value={tutorData.engagementEndDate}
            onChange={(value) => handleFieldChange('engagementEndDate', value)}
            onBlur={() => handleBlur('engagementEndDate')}
            minDate={addDaysToDateString(tutorData.engagementStartDate, 1)}
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
          value={tutorData.targetHours === '' ? '' : String(tutorData.targetHours)}
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
