import * as React from 'react';
import { User, BookOpen, Clock, GraduationCap, Users, Building2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AvailabilityGrid } from '@/components/forms/AvailabilityGrid';
import { Checkbox } from '@/components/forms/Checkbox';
import { Textarea } from '@/components/forms/Textarea';
import { DateSplitInput } from '@/components/forms/DateSplitInput';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createStudent } from '@/services/students.service';
import { getRoles, getStudents } from '@/services/users.service';
import { getSubjects, getLevels, getSchoolClasses } from '@/services/academic.service';
import { getEstablishment } from '@/services/establishments.service';
import { getSpecialties } from '@/services/specialties.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import type { CreateStudentDto } from '@/types/student.types';
import type { AvailabilitySlot } from '@/components/forms/AvailabilityGrid';
import type { UserWithProfile } from '@/types/user.types';
import { studentToUserWithProfile } from '@/utils/created-user-profile';
import { toast } from '@/lib/toast';
import { useFormValidation } from '@/hooks/useFormValidation';
import { studentValidationSchema } from '@/utils/validation-schemas';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import {
  DISABILITY_TYPE_OPTIONS,
  SPECIAL_NEEDS_TYPE_OPTIONS,
} from '@/components/students/student-configs';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

interface CreateStudentViewProps {
  onClose: () => void;
  /** Utilisateur créé (profil UI) — permet l’ajout immédiat à une séance / matching. */
  onSuccess?: (created: UserWithProfile) => void;
}

// ══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════

export const CreateStudentView: React.FC<CreateStudentViewProps> = ({ onClose, onSuccess }) => {
  const validation = useFormValidation(studentValidationSchema);

  const [isDisplayNameManuallyEdited, setIsDisplayNameManuallyEdited] = React.useState(false);
  const [displayNameCheckQuery, setDisplayNameCheckQuery] = React.useState('');
  const [maxNomLength, setMaxNomLength] = React.useState(2);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNameRef = React.useRef('');
  const prevFirstNameRef = React.useRef('');

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

  const { data: displayNameCheckResult } = useQuery({
    queryKey: ['students-displayname-check', displayNameCheckQuery],
    queryFn: () => getStudents({ search: displayNameCheckQuery, pageSize: 5 }),
    enabled: displayNameCheckQuery.length >= 2,
    staleTime: 10_000,
  });

  const displayNameAlreadyExists = React.useMemo(() => {
    if (!displayNameCheckQuery || !displayNameCheckResult?.data) return false;
    return displayNameCheckResult.data.some(
      (s) => s.displayName?.toLowerCase() === displayNameCheckQuery.toLowerCase(),
    );
  }, [displayNameCheckQuery, displayNameCheckResult]);

  const [studentData, setStudentData] = React.useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string;
    gender: 'M' | 'F' | 'O' | '';
    levelId: string;
    schoolClassId: string;
    addressLine1: string;
    department: string;
    postalCode: string;
    city: string;
    country: string;
    roleIds: string[];
    establishmentIds: string[];
    subjects: string[];
    availability: {
      weekly: AvailabilitySlot[];
    };
    hasSpecialNeeds: boolean;
    specialNeedsType: string;
    specialNeedsNote: string;
    isDisabled: boolean;
    disabilityTypes: string[];
    disabilityOtherNote: string;
    medicalNotes: string;
    status: string;
    specialtyIds: string[];
  }>({
    firstName: '',
    lastName: '',
    displayName: '',
    dateOfBirth: '',
    gender: '',
    levelId: '',
    schoolClassId: '',
    addressLine1: '',
    department: '',
    postalCode: '',
    city: '',
    country: 'FR',
    roleIds: [] as string[],
    establishmentIds: [] as string[],
    subjects: [] as string[],
    availability: {
      weekly: [] as AvailabilitySlot[],
    },
    hasSpecialNeeds: false,
    specialNeedsType: '',
    specialNeedsNote: '',
    isDisabled: false,
    disabilityTypes: [] as string[],
    disabilityOtherNote: '',
    medicalNotes: '',
    status: 'registered',
    specialtyIds: [] as string[],
  });

  const selectedEstablishmentIds = studentData.establishmentIds;
  const selectedEstablishmentId = selectedEstablishmentIds[0]; // pour la query school-classes
  const selectedLevelId = studentData.levelId;

  const { data: levels = [] } = useQuery({
    queryKey: ['levels', 'all'],
    queryFn: async () => {
      const response = await getLevels({ pageSize: 100 });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: schoolClassesRes } = useQuery({
    queryKey: ['school-classes', selectedEstablishmentId, selectedLevelId],
    queryFn: async () => {
      if (!selectedLevelId) return { data: [], total: 0, page: 1, pageSize: 200 };
      return getSchoolClasses({
        establishmentId: selectedEstablishmentId || undefined,
        levelId: selectedLevelId,
        pageSize: 200,
      });
    },
    enabled: !!selectedEstablishmentId && !!selectedLevelId,
    staleTime: 0,
  });
  const schoolClasses = schoolClassesRes?.data ?? [];

  // Charger le détail de l'établissement (offeredSpecialties) pour les lycées
  const { data: selectedEstablishmentDetail } = useQuery({
    queryKey: ['establishment-detail', selectedEstablishmentId],
    queryFn: () => getEstablishment(selectedEstablishmentId),
    enabled: !!selectedEstablishmentId,
    staleTime: 5 * 60 * 1000,
  });

  // Charger toutes les spécialités actives avec leurs liens de niveaux
  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties', 'active'],
    queryFn: () => getSpecialties(true),
    staleTime: 10 * 60 * 1000,
  });

  // Calculer les options de spécialités : offertes par l'établissement ET liées au niveau choisi
  const specialtyOptions = React.useMemo(() => {
    if (!selectedLevelId || !selectedEstablishmentDetail?.offeredSpecialties) return [];
    const offeredIds = new Set(selectedEstablishmentDetail.offeredSpecialties.map((s) => s.id));
    return allSpecialties
      .filter(
        (s) => offeredIds.has(s.id) && s.levelLinks?.some((ll) => ll.level.id === selectedLevelId),
      )
      .map((s) => ({ value: s.id, label: s.label }));
  }, [selectedLevelId, selectedEstablishmentDetail, allSpecialties]);

  React.useEffect(() => {
    if (isDisplayNameManuallyEdited) return;
    const firstName = studentData.firstName.trim();
    const lastName = studentData.lastName.trim();
    if (!firstName && !lastName) return;
    const generated = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName;
    setStudentData((prev) => ({ ...prev, displayName: generated }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (lastName.length >= 2) {
      debounceRef.current = setTimeout(() => {
        setDisplayNameCheckQuery(generated);
      }, 600);
    } else {
      setDisplayNameCheckQuery('');
    }
  }, [studentData.firstName, studentData.lastName, isDisplayNameManuallyEdited]);

  // Reset maxNomLength et lastName quand le prénom change (pas au montage initial)
  React.useEffect(() => {
    const prev = prevFirstNameRef.current;
    prevFirstNameRef.current = studentData.firstName;
    if (prev === '') return; // montage initial ou prénom vide → ne pas vider lastName
    setMaxNomLength(2);
    setStudentData((s) => ({ ...s, lastName: '' }));
  }, [studentData.firstName]);

  // Maintenir le ref synchronisé avec la valeur courante de lastName
  React.useEffect(() => {
    lastNameRef.current = studentData.lastName;
  }, [studentData.lastName]);

  // Incrémenter maxNomLength uniquement quand displayNameAlreadyExists passe à true
  // (sans lastName dans les deps pour éviter l'incrémentation prématurée sur chaque frappe)
  React.useEffect(() => {
    if (displayNameAlreadyExists) {
      const len = lastNameRef.current.trim().length;
      setMaxNomLength((prev) => Math.max(prev, len + 1));
    }
  }, [displayNameAlreadyExists]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateStudentDto) => createStudent(dto),
    onSuccess: (created) => {
      toast.success('Élève créé avec succès !');
      const profile = studentToUserWithProfile(created);
      onSuccess?.(profile);
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Erreur lors de la création de l'élève");
    },
  });

  const handleFieldChange = (field: keyof typeof studentData, value: any) => {
    setStudentData((prev) => {
      const next = { ...prev, [field]: value };
      // Reset en cascade
      if (field === 'establishmentIds') {
        next.levelId = '';
        next.schoolClassId = '';
        next.specialtyIds = [];
      }
      if (field === 'levelId') {
        next.schoolClassId = '';
        next.specialtyIds = [];
      }
      return next;
    });
    const updatedData = { ...studentData, [field]: value };
    validation.validateField(field, value, updatedData);
    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm(studentData);

    if (!isValid) {
      return;
    }

    const studentRole = roles.find((r) => r.code === 'student');
    if (!studentRole) {
      toast.error('Rôle élève non trouvé');
      return;
    }

    const dto: CreateStudentDto = {
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      displayName: studentData.displayName || undefined,
      dateOfBirth: studentData.dateOfBirth || undefined,
      gender: studentData.gender || undefined,
      levelId: studentData.levelId || undefined,
      schoolClassId: studentData.schoolClassId || undefined,
      addressLine1: studentData.addressLine1 || undefined,
      department: studentData.department || undefined,
      postalCode: studentData.postalCode || undefined,
      city: studentData.city || undefined,
      country: studentData.country || undefined,
      medicalNotes: studentData.medicalNotes || undefined,
      roleIds: [studentRole.id],
      establishmentIds: studentData.establishmentIds,
      subjects: studentData.subjects.length > 0 ? studentData.subjects : undefined,
      availability:
        studentData.availability.weekly.length > 0 ? studentData.availability : undefined,
      hasSpecialNeeds: studentData.hasSpecialNeeds,
      specialNeedsType:
        studentData.hasSpecialNeeds && studentData.specialNeedsType
          ? studentData.specialNeedsType
          : undefined,
      specialNeedsNote:
        studentData.hasSpecialNeeds &&
        studentData.specialNeedsType === 'autre' &&
        studentData.specialNeedsNote
          ? studentData.specialNeedsNote
          : undefined,
      isDisabled: studentData.isDisabled,
      disabilityTypes:
        studentData.isDisabled && studentData.disabilityTypes.length > 0
          ? studentData.disabilityTypes
          : undefined,
      disabilityOtherNote:
        studentData.isDisabled &&
        studentData.disabilityTypes.includes('autre') &&
        studentData.disabilityOtherNote
          ? studentData.disabilityOtherNote
          : undefined,
      specialtyIds: studentData.specialtyIds.length > 0 ? studentData.specialtyIds : undefined,
    };
    createMutation.mutate(dto);
  };

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.label,
  }));

  const levelOptions = levels.map((level) => ({
    value: level.id,
    label: level.label,
  }));

  const genderOptions = [
    { value: 'M', label: 'Homme' },
    { value: 'F', label: 'Femme' },
  ];

  const isSubmitting = createMutation.isPending;

  const canSubmit =
    studentData.firstName.trim().length >= 2 &&
    studentData.lastName.trim().length >= 2 &&
    studentData.gender !== '' &&
    studentData.establishmentIds.length > 0 &&
    !displayNameAlreadyExists;

  return (
    <SlidePanelForm
      formType="create"
      title="Créer un élève"
      subtitle="Renseignez les informations de l'élève"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={canSubmit}
    >
      {/* ════════════════════════════════════
          SECTION 1 : Informations personnelles
          ════════════════════════════════════ */}
      <div className="form-section">
        <h4 className="form-section-title">
          <User className="w-4 h-4" />
          Informations personnelles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={studentData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            placeholder="Ex: Marie"
            maxLength={100}
            required
            state={validation.getFieldState('firstName')}
            error={validation.getFieldError('firstName')}
          />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={!studentData.firstName.trim() ? 'cursor-not-allowed' : ''}>
                  <Input
                    label="Nom"
                    value={studentData.lastName}
                    onChange={(e) =>
                      handleFieldChange('lastName', e.target.value.slice(0, maxNomLength))
                    }
                    onBlur={() => handleBlur('lastName')}
                    placeholder="Ex: MA"
                    maxLength={maxNomLength}
                    required
                    disabled={!studentData.firstName.trim()}
                    state={
                      displayNameAlreadyExists ? 'error' : validation.getFieldState('lastName')
                    }
                    error={
                      displayNameAlreadyExists
                        ? 'Ce nom complet existe déjà, ajoutez un caractère supplémentaire'
                        : validation.getFieldError('lastName')
                    }
                  />
                </span>
              </TooltipTrigger>
              {!studentData.firstName.trim() && (
                <TooltipContent side="top">
                  <p>Saisissez d'abord le prénom</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {/* Date de naissance — masquée */}
          <div className="col-span-full hidden">
            <DateSplitInput
              label="Date de naissance"
              value={studentData.dateOfBirth}
              onChange={(value) => handleFieldChange('dateOfBirth', value)}
              onBlur={() => handleBlur('dateOfBirth')}
              maxDate={`${new Date().getFullYear() - 3}-12-31`}
            />
          </div>
          <div className="col-span-full">
            <Select
              label="Genre"
              value={studentData.gender}
              onChange={(value) => handleFieldChange('gender', value)}
              onBlur={() => handleBlur('gender')}
              options={genderOptions}
              placeholder="Sélectionner"
              required
              state={validation.getFieldState('gender')}
              error={validation.getFieldError('gender')}
            />
          </div>
        </div>
      </div>

      {/* Section adresse masquée (confidentialité RGPD) */}

      {/* ════════════════════════════════════
          SECTION 2 : Établissement
          ════════════════════════════════════ */}
      <div className="form-section">
        <h4 className="form-section-title">
          <Building2 className="w-4 h-4" />
          Établissement
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <MultiSelect
            label="Établissement"
            placeholder="Rechercher un établissement..."
            options={getEstabOptions(studentData.establishmentIds)}
            value={studentData.establishmentIds}
            onChange={(values) =>
              handleFieldChange(
                'establishmentIds',
                values.length > 1 ? [values[values.length - 1]] : values,
              )
            }
            onBlur={() => handleBlur('establishmentIds')}
            onSearch={onEstabSearch}
            isSearchLoading={estabSearchLoading}
            searchPlaceholder="Rechercher un établissement..."
            minSearchLength={2}
            maxVisibleTags={1}
            showSelectAll={false}
            helperText={ESTABLISHMENT_SEARCH_HINT}
            required
            state={validation.getFieldState('establishmentIds')}
            error={validation.getFieldError('establishmentIds')}
          />
        </div>
      </div>

      {/* ════════════════════════════════════
          SECTION 3 : Scolarité (conditionnel)
          ════════════════════════════════════ */}
      {selectedEstablishmentIds.length > 0 && (
        <div className="form-section">
          <h4 className="form-section-title">
            <GraduationCap className="w-4 h-4" />
            Scolarité
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <Select
              label="Niveaux académiques"
              placeholder={
                levels.length === 0 ? 'Aucun niveau disponible' : 'Sélectionner un niveau'
              }
              options={levelOptions}
              value={studentData.levelId}
              onChange={(value) => handleFieldChange('levelId', value)}
              onBlur={() => handleBlur('levelId')}
            />

            {!!selectedLevelId && (
              <Select
                label="Classe"
                value={studentData.schoolClassId}
                onChange={(value) => handleFieldChange('schoolClassId', value)}
                onBlur={() => handleBlur('schoolClassId')}
                options={schoolClasses.map((sc) => ({ value: sc.id, label: sc.name }))}
                placeholder={
                  schoolClasses.length === 0
                    ? 'Aucune classe disponible pour ce niveau'
                    : 'Sélectionner une classe (optionnel)'
                }
              />
            )}

            {specialtyOptions.length > 0 && (
              <MultiSelect
                label="Spécialités"
                placeholder="Sélectionnez les spécialités"
                options={specialtyOptions}
                value={studentData.specialtyIds}
                onChange={(values) => handleFieldChange('specialtyIds', values)}
                onBlur={() => handleBlur('specialtyIds')}
                maxVisibleTags={3}
                helperText="Spécialités proposées par l'établissement pour ce niveau"
              />
            )}

            <div className="space-y-3">
              <div className="flex items-end pb-2">
                <Checkbox
                  id="hasSpecialNeeds"
                  label="A des besoins spécifiques"
                  checked={studentData.hasSpecialNeeds}
                  onCheckedChange={(checked) => {
                    handleFieldChange('hasSpecialNeeds', checked);
                    if (!checked) {
                      handleFieldChange('specialNeedsType', '');
                      handleFieldChange('specialNeedsNote', '');
                    }
                  }}
                />
              </div>
              {studentData.hasSpecialNeeds && (
                <div className="space-y-3 pl-1">
                  <Select
                    label="Type de besoin spécifique"
                    value={studentData.specialNeedsType}
                    onChange={(value) => {
                      handleFieldChange('specialNeedsType', value);
                      if (value !== 'autre') handleFieldChange('specialNeedsNote', '');
                    }}
                    onBlur={() => handleBlur('specialNeedsType')}
                    options={SPECIAL_NEEDS_TYPE_OPTIONS}
                    placeholder="Sélectionner le type"
                    state={validation.getFieldState('specialNeedsType')}
                    error={validation.getFieldError('specialNeedsType')}
                  />
                  {studentData.specialNeedsType === 'autre' && (
                    <Input
                      label="Préciser le besoin"
                      value={studentData.specialNeedsNote}
                      onChange={(e) => handleFieldChange('specialNeedsNote', e.target.value)}
                      onBlur={() => handleBlur('specialNeedsNote')}
                      placeholder="Décrivez le besoin spécifique"
                      maxLength={200}
                      state={validation.getFieldState('specialNeedsNote')}
                      error={validation.getFieldError('specialNeedsNote')}
                    />
                  )}
                </div>
              )}
            </div>

            {/* ── Situation de handicap ── */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Élève en situation de handicap ?
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="isDisabledCreate"
                    value="yes"
                    checked={studentData.isDisabled === true}
                    onChange={() => handleFieldChange('isDisabled', true)}
                    className="accent-primary"
                  />
                  Oui
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="isDisabledCreate"
                    value="no"
                    checked={studentData.isDisabled === false}
                    onChange={() => {
                      handleFieldChange('isDisabled', false);
                      handleFieldChange('disabilityTypes', []);
                      handleFieldChange('disabilityOtherNote', '');
                    }}
                    className="accent-primary"
                  />
                  Non
                </label>
              </div>
              {studentData.isDisabled && (
                <div className="space-y-3 pl-1">
                  <MultiSelect
                    label="Types de handicap"
                    placeholder="Sélectionner les types"
                    options={DISABILITY_TYPE_OPTIONS}
                    value={studentData.disabilityTypes}
                    onChange={(values) => {
                      handleFieldChange('disabilityTypes', values);
                      if (!values.includes('autre')) handleFieldChange('disabilityOtherNote', '');
                    }}
                    maxVisibleTags={4}
                  />
                  {studentData.disabilityTypes.includes('autre') && (
                    <Input
                      label="Préciser le type de handicap"
                      value={studentData.disabilityOtherNote}
                      onChange={(e) => handleFieldChange('disabilityOtherNote', e.target.value)}
                      placeholder="Décrivez le type de handicap"
                      maxLength={200}
                      required
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          SECTION 4 : Matières suivies
          ════════════════════════════════════ */}
      <div className="form-section">
        <h4 className="form-section-title">
          <BookOpen className="w-4 h-4" />
          Matières suivies
        </h4>
        <MultiSelect
          label="Matières"
          placeholder="Sélectionnez les matières"
          options={subjectOptions}
          value={studentData.subjects}
          onChange={(values) => handleFieldChange('subjects', values)}
          onBlur={() => handleBlur('subjects')}
          maxVisibleTags={3}
          helperText="Sélectionnez les matières que l'élève suit"
          state={validation.getFieldState('subjects')}
          error={validation.getFieldError('subjects')}
        />
      </div>

      {/* ════════════════════════════════════
          SECTION 5 : Disponibilités
          ════════════════════════════════════ */}
      <div className="form-section">
        <h4 className="form-section-title">
          <Clock className="w-4 h-4" />
          Disponibilités
        </h4>
        <AvailabilityGrid
          value={studentData.availability}
          onChange={(value) => handleFieldChange('availability', value)}
          disabled={false}
          maxVisibleRows={10}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Définissez les créneaux horaires hebdomadaires où l'élève est disponible
        </p>
      </div>

      {/* ════════════════════════════════════
          SECTION 6 : Notes
          ════════════════════════════════════ */}
      <div className="form-section">
        <h4 className="form-section-title">
          <Users className="w-4 h-4" />
          Notes
        </h4>
        <Textarea
          label="Notes"
          value={studentData.medicalNotes}
          onChange={(e) => handleFieldChange('medicalNotes', e.target.value)}
          onBlur={() => handleBlur('medicalNotes')}
          placeholder="Informations ou commentaires sur l'élève"
          maxLength={500}
          rows={3}
          state={validation.getFieldState('medicalNotes')}
          error={validation.getFieldError('medicalNotes')}
          helperText="Informations ou commentaires sur l'élève"
        />
      </div>
    </SlidePanelForm>
  );
};
