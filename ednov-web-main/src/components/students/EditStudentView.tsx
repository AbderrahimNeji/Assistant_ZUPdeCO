import * as React from 'react';
import { User, GraduationCap, BookOpen, Clock, Users, Building2, MapPin } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AvailabilityGrid } from '@/components/forms/AvailabilityGrid';
import { Checkbox } from '@/components/forms/Checkbox';
import { Textarea } from '@/components/forms/Textarea';
import { DateSplitInput } from '@/components/forms/DateSplitInput';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getStudent, getStudentStatusHistory, getStudents } from '@/services/users.service';
import { updateStudent } from '@/services/students.service';
import { getSubjects, getLevels, getSchoolClasses } from '@/services/academic.service';
import { getEstablishment } from '@/services/establishments.service';
import { getSpecialties } from '@/services/specialties.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useEnrichEstablishmentLabels } from '@/hooks/useEnrichEstablishmentLabels';
import type { UpdateStudentDto } from '@/types/student.types';
import { normalizeStudentAccountStatus, type StudentAccountStatus } from '@/types/user.types';
import type { AvailabilitySlot } from '@/components/forms/AvailabilityGrid';
import { useFormValidation } from '@/hooks/useFormValidation';
import { studentValidationSchema } from '@/utils/validation-schemas';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { DISABILITY_TYPE_OPTIONS } from '@/components/students/student-configs';
import {
  getStudentEditStatusSelectOptions,
  resolvePreviousStatusBeforeDeactivate,
  SPECIAL_NEEDS_TYPE_OPTIONS,
  KNOWN_SPECIAL_NEEDS_TYPES,
  EXIT_REASON_OPTIONS,
  EXIT_REASON_VALUES,
} from '@/components/students/student-configs';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

interface EditStudentViewProps {
  studentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// ══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════

function resolveSpecialNeeds(
  rawType?: string | null,
  rawNote?: string | null,
): { specialNeedsType: string; specialNeedsNote: string } {
  if (!rawType) return { specialNeedsType: '', specialNeedsNote: rawNote || '' };
  const lowerType = rawType.toLowerCase();
  if (KNOWN_SPECIAL_NEEDS_TYPES.has(lowerType)) {
    return { specialNeedsType: lowerType, specialNeedsNote: rawNote || '' };
  }
  return { specialNeedsType: 'autre', specialNeedsNote: rawType };
}

export const EditStudentView: React.FC<EditStudentViewProps> = ({
  studentId,
  onClose,
  onSuccess,
}) => {
  const [displayNameCheckQuery, setDisplayNameCheckQuery] = React.useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = React.useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    status: string;
    dateOfBirth: string;
    gender: string;
    levelId: string;
    schoolClassId: string;
    addressLine1: string;
    department: string;
    postalCode: string;
    city: string;
    country: string;
    establishmentIds: string[];
    subjects: string[];
    availability: { weekly: AvailabilitySlot[] };
    hasSpecialNeeds: boolean;
    specialNeedsType: string;
    specialNeedsNote: string;
    isDisabled: boolean;
    disabilityTypes: string[];
    disabilityOtherNote: string;
    medicalNotes: string;
    specialtyIds: string[];
    deactivationReasonType: string;
    deactivationReasonOther: string;
  }>({
    firstName: '',
    lastName: '',
    displayName: '',
    status: 'registered',
    dateOfBirth: '',
    gender: '',
    levelId: '',
    schoolClassId: '',
    addressLine1: '',
    department: '',
    postalCode: '',
    city: '',
    country: 'FR',
    establishmentIds: [],
    subjects: [],
    availability: { weekly: [] },
    hasSpecialNeeds: false,
    specialNeedsType: '',
    specialNeedsNote: '',
    isDisabled: false,
    disabilityTypes: [],
    disabilityOtherNote: '',
    medicalNotes: '',
    specialtyIds: [],
    deactivationReasonType: '',
    deactivationReasonOther: '',
  });

  const [isDisplayNameManuallyEdited, setIsDisplayNameManuallyEdited] = React.useState(false);
  const [maxNomLength, setMaxNomLength] = React.useState(2);
  const skipAutoGenOnLoadRef = React.useRef(false);
  const prevFirstNameRef = React.useRef('');
  const lastNameRef = React.useRef('');

  const validation = useFormValidation(studentValidationSchema);

  const { data: student, isLoading } = useQuery({
    queryKey: ['students', studentId],
    queryFn: () => getStudent(studentId),
  });

  const studentStatusNorm = student ? normalizeStudentAccountStatus(String(student.status)) : null;

  const { data: statusHistory = [] } = useQuery({
    queryKey: ['students', studentId, 'status-history'],
    queryFn: () => getStudentStatusHistory(studentId),
    enabled: !!studentId && studentStatusNorm === 'deactivated',
  });

  const previousStatusBeforeDeactivate = React.useMemo(
    () => resolvePreviousStatusBeforeDeactivate(statusHistory),
    [statusHistory],
  );

  const studentReactivationTargetStatus = React.useMemo(() => {
    const r = student?.reactivationTargetStatus;
    return r === 'registered' || r === 'accompanied' ? r : null;
  }, [student?.reactivationTargetStatus]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
  });

  const selectedEstablishmentIds = formData.establishmentIds;
  const selectedEstablishmentId = selectedEstablishmentIds[0]; // pour la query school-classes
  const selectedLevelId = formData.levelId;

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

  const { data: displayNameCheckResult } = useQuery({
    queryKey: ['students-displayname-check-edit', displayNameCheckQuery],
    queryFn: () => getStudents({ search: displayNameCheckQuery, pageSize: 5 }),
    enabled: displayNameCheckQuery.length >= 2,
    staleTime: 10_000,
  });

  const displayNameAlreadyExists = React.useMemo(() => {
    if (!displayNameCheckQuery || !displayNameCheckResult?.data) return false;
    return displayNameCheckResult.data.some(
      (s) =>
        s.displayName?.toLowerCase() === displayNameCheckQuery.toLowerCase() && s.id !== studentId,
    );
  }, [displayNameCheckQuery, displayNameCheckResult, studentId]);

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

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
    preloadLabels: preloadEstabLabels,
    primeLabelCache: primeEstabLabelCache,
  } = useEstablishmentsMultiselect();

  useEnrichEstablishmentLabels(selectedEstablishmentIds, primeEstabLabelCache);

  React.useEffect(() => {
    if (student) {
      const ueList = ((student as any).userEstablishments ?? []) as Array<{
        establishmentId: string;
        establishment?: { id?: string; name?: string } | null;
      }>;
      const scEst = (student as any).userProfiles?.[0]?.schoolClass?.establishment as
        | { id: string; name: string }
        | undefined;

      const labelEntries: Array<{ id: string; name: string }> = [];
      for (const ue of ueList) {
        const id = ue.establishmentId;
        const name = ue.establishment?.name?.trim();
        if (id && name) labelEntries.push({ id, name });
      }
      if (scEst?.id && scEst.name?.trim()) {
        labelEntries.push({ id: scEst.id, name: scEst.name.trim() });
      }
      primeEstabLabelCache(labelEntries);

      const ueIds = ueList.map((ue) => ue.establishmentId).filter(Boolean);
      const scId = scEst?.id;
      const establishmentIds = [...new Set([...ueIds, ...(scId ? [scId] : [])])];

      const initialData = {
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        displayName: student.displayName || '',
        status: normalizeStudentAccountStatus(String(student.status)),
        dateOfBirth: student.userProfiles?.[0]?.dateOfBirth || '',
        gender: student.userProfiles?.[0]?.gender || '',
        levelId: student.userProfiles?.[0]?.levelId ?? '',
        schoolClassId: (student.userProfiles?.[0] as any)?.schoolClassId || '',
        addressLine1: (student.userProfiles?.[0] as any)?.addressLine1 || '',
        department: (student.userProfiles?.[0] as any)?.department || '',
        postalCode: (student.userProfiles?.[0] as any)?.postalCode || '',
        city: (student.userProfiles?.[0] as any)?.city || '',
        country: (student.userProfiles?.[0] as any)?.country || 'FR',
        establishmentIds,
        subjects: (student.userProfiles?.[0]?.subjects || []) as string[],
        availability: (student.userProfiles?.[0]?.availability as {
          weekly: AvailabilitySlot[];
        }) || {
          weekly: [],
        },
        hasSpecialNeeds: student.userProfiles?.[0]?.hasSpecialNeeds || false,
        ...resolveSpecialNeeds(
          (student.userProfiles?.[0] as any)?.specialNeedsType,
          (student.userProfiles?.[0] as any)?.specialNeedsNote,
        ),
        isDisabled: (student.userProfiles?.[0] as any)?.isDisabled || false,
        disabilityTypes: (student.userProfiles?.[0] as any)?.disabilityTypes || [],
        disabilityOtherNote: (student.userProfiles?.[0] as any)?.disabilityOtherNote || '',
        medicalNotes: student.userProfiles?.[0]?.medicalNotes || '',
        specialtyIds:
          student.userProfiles?.[0]?.userProfileSpecialties?.map((ups) => ups.specialty.id) ?? [],
        deactivationReasonType: (() => {
          const r = (student as any).deactivationReason ?? '';
          if (EXIT_REASON_VALUES.includes(r as (typeof EXIT_REASON_VALUES)[number])) return r;
          if (r) return 'Autre';
          return '';
        })(),
        deactivationReasonOther: (() => {
          const note = (student as any).deactivationReasonNote;
          if (note) return note;
          const r = (student as any).deactivationReason ?? '';
          if (r && !EXIT_REASON_VALUES.includes(r as (typeof EXIT_REASON_VALUES)[number])) return r;
          return '';
        })(),
      };
      skipAutoGenOnLoadRef.current = true;
      setFormData(initialData);
      setMaxNomLength(Math.max(2, (initialData.lastName || '').trim().length));
      validation.validateInitialFormData(initialData);

      // Pré-alimenter le cache du multiselect avec les noms des établissements déjà liés
      const estabEntries =
        (student as any).userEstablishments
          ?.filter((ue: any) => ue.establishment?.id && ue.establishment?.name)
          .map((ue: any) => ({ id: ue.establishment.id, label: ue.establishment.name })) ?? [];
      if (estabEntries.length > 0) {
        preloadEstabLabels(estabEntries);
      }
    }
  }, [student, primeEstabLabelCache]);

  // Auto-génération du nom d'affichage quand firstName ou lastName changent
  React.useEffect(() => {
    if (skipAutoGenOnLoadRef.current) {
      skipAutoGenOnLoadRef.current = false;
      return;
    }
    if (isDisplayNameManuallyEdited) return;
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    if (!firstName && !lastName) return;
    const generated = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName;
    setFormData((prev) => ({ ...prev, displayName: generated }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (lastName.length >= 2) {
      debounceRef.current = setTimeout(() => {
        setDisplayNameCheckQuery(generated);
      }, 600);
    } else {
      setDisplayNameCheckQuery('');
    }
  }, [formData.firstName, formData.lastName, isDisplayNameManuallyEdited]);

  // Reset maxNomLength et lastName uniquement si l'utilisateur change activement le prénom
  // (prev non-vide = prénom déjà saisi, pas un chargement initial depuis l'API)
  React.useEffect(() => {
    const prev = prevFirstNameRef.current;
    prevFirstNameRef.current = formData.firstName;
    if (prev === '') return;
    setMaxNomLength(2);
    setFormData((s) => ({ ...s, lastName: '' }));
  }, [formData.firstName]);

  // Maintenir le ref synchronisé avec la valeur courante de lastName
  React.useEffect(() => {
    lastNameRef.current = formData.lastName;
  }, [formData.lastName]);

  // Incrémenter maxNomLength uniquement quand displayNameAlreadyExists passe à true
  // (sans formData.lastName dans les deps pour éviter l'incrémentation prématurée sur chaque frappe)
  React.useEffect(() => {
    if (displayNameAlreadyExists) {
      const len = lastNameRef.current.trim().length;
      setMaxNomLength((prev) => Math.max(prev, len + 1));
    }
  }, [displayNameAlreadyExists]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateStudentDto) => updateStudent(studentId, dto),
    onSuccess: () => {
      toast.success('Élève modifié avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Erreur lors de la modification de l'élève");
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
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
      if (field === 'status' && value !== 'deactivated') {
        next.deactivationReasonType = '';
        next.deactivationReasonOther = '';
      }
      if (field === 'deactivationReasonType' && value !== 'Autre') {
        next.deactivationReasonOther = '';
      }
      return next;
    });
    const updatedData = { ...formData, [field]: value };
    validation.validateField(field, value, updatedData);
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

    const dto: UpdateStudentDto = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      displayName: formData.displayName || undefined,
      status: formData.status as StudentAccountStatus,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender as 'M' | 'F' | 'O' | undefined,
      levelId: formData.levelId || undefined,
      schoolClassId: formData.schoolClassId || null,
      addressLine1: formData.addressLine1 || undefined,
      department: formData.department || undefined,
      postalCode: formData.postalCode || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      establishmentIds:
        formData.establishmentIds.length > 0 ? formData.establishmentIds : undefined,
      subjects: formData.subjects.length > 0 ? formData.subjects : undefined,
      availability: formData.availability.weekly.length > 0 ? formData.availability : undefined,
      hasSpecialNeeds: formData.hasSpecialNeeds,
      specialNeedsType:
        formData.hasSpecialNeeds && formData.specialNeedsType
          ? formData.specialNeedsType
          : undefined,
      specialNeedsNote:
        formData.hasSpecialNeeds &&
        formData.specialNeedsType === 'autre' &&
        formData.specialNeedsNote
          ? formData.specialNeedsNote
          : undefined,
      isDisabled: formData.isDisabled,
      disabilityTypes:
        formData.isDisabled && formData.disabilityTypes.length > 0 ? formData.disabilityTypes : [],
      disabilityOtherNote:
        formData.isDisabled &&
        formData.disabilityTypes.includes('autre') &&
        formData.disabilityOtherNote
          ? formData.disabilityOtherNote
          : undefined,
      medicalNotes: formData.medicalNotes || undefined,
      specialtyIds: formData.specialtyIds.length > 0 ? formData.specialtyIds : undefined,
      deactivationReason:
        formData.status === 'deactivated'
          ? formData.deactivationReasonType || undefined
          : undefined,
      deactivationReasonNote:
        formData.status === 'deactivated' && formData.deactivationReasonType === 'Autre'
          ? formData.deactivationReasonOther || undefined
          : undefined,
    };
    updateMutation.mutate(dto);
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

  const canSubmit =
    formData.firstName.trim().length >= 2 &&
    formData.lastName.trim().length >= 2 &&
    formData.gender !== '' &&
    formData.establishmentIds.length > 0 &&
    !displayNameAlreadyExists;

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier un élève"
      subtitle="Modifiez les informations de cet élève"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={canSubmit}
      isLoading={isLoading}
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
            value={formData.firstName}
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
                <span className={!formData.firstName.trim() ? 'cursor-not-allowed' : ''}>
                  <Input
                    label="Nom"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleFieldChange('lastName', e.target.value.slice(0, maxNomLength))
                    }
                    onBlur={() => handleBlur('lastName')}
                    placeholder="Ex: MA"
                    maxLength={maxNomLength}
                    required
                    disabled={!formData.firstName.trim()}
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
              {!formData.firstName.trim() && (
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
              value={formData.dateOfBirth}
              onChange={(value) => handleFieldChange('dateOfBirth', value)}
              onBlur={() => handleBlur('dateOfBirth')}
              maxDate={`${new Date().getFullYear() - 3}-12-31`}
            />
          </div>
          <div className="col-span-full">
            <Select
              label="Genre"
              value={formData.gender}
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
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Select
            label="Statut"
            value={formData.status}
            onChange={(value) => handleFieldChange('status', value)}
            onBlur={() => handleBlur('status')}
            options={getStudentEditStatusSelectOptions(
              formData.status as StudentAccountStatus,
              formData.status === 'deactivated'
                ? {
                    previousStatusBeforeDeactivate,
                    reactivationTargetStatus: studentReactivationTargetStatus,
                  }
                : undefined,
            )}
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
          />
          {formData.status === 'deactivated' && (
            <>
              <Select
                label="Motif de sortie"
                value={formData.deactivationReasonType}
                onChange={(v) => handleFieldChange('deactivationReasonType', v)}
                options={[{ value: '', label: 'Sélectionner un motif…' }, ...EXIT_REASON_OPTIONS]}
              />
              {formData.deactivationReasonType === 'Autre' && (
                <Input
                  label="Préciser le motif"
                  value={formData.deactivationReasonOther}
                  onChange={(e) => handleFieldChange('deactivationReasonOther', e.target.value)}
                  onBlur={() => handleBlur('deactivationReasonOther')}
                  placeholder="Précisez le motif…"
                  maxLength={200}
                  required
                />
              )}
            </>
          )}
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
            options={getEstabOptions(formData.establishmentIds)}
            value={formData.establishmentIds}
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
              value={formData.levelId}
              onChange={(value) => handleFieldChange('levelId', value)}
              onBlur={() => handleBlur('levelId')}
            />

            {!!selectedLevelId && (
              <Select
                label="Classe"
                value={formData.schoolClassId}
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
                value={formData.specialtyIds}
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
                  checked={formData.hasSpecialNeeds}
                  onCheckedChange={(checked) => {
                    handleFieldChange('hasSpecialNeeds', checked);
                    if (!checked) {
                      handleFieldChange('specialNeedsType', '');
                      handleFieldChange('specialNeedsNote', '');
                    }
                  }}
                />
              </div>
              {formData.hasSpecialNeeds && (
                <div className="space-y-3 pl-1">
                  <Select
                    label="Type de besoin spécifique"
                    value={formData.specialNeedsType}
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
                  {formData.specialNeedsType === 'autre' && (
                    <Input
                      label="Préciser le besoin"
                      value={formData.specialNeedsNote}
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
                    name="isDisabled"
                    value="yes"
                    checked={formData.isDisabled === true}
                    onChange={() => handleFieldChange('isDisabled', true)}
                    className="accent-primary"
                  />
                  Oui
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="isDisabled"
                    value="no"
                    checked={formData.isDisabled === false}
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
              {formData.isDisabled && (
                <div className="space-y-3 pl-1">
                  <MultiSelect
                    label="Types de handicap"
                    placeholder="Sélectionner les types"
                    options={DISABILITY_TYPE_OPTIONS}
                    value={formData.disabilityTypes}
                    onChange={(values) => {
                      handleFieldChange('disabilityTypes', values);
                      if (!values.includes('autre')) handleFieldChange('disabilityOtherNote', '');
                    }}
                    maxVisibleTags={4}
                  />
                  {formData.disabilityTypes.includes('autre') && (
                    <Input
                      label="Préciser le type de handicap"
                      value={formData.disabilityOtherNote}
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
          value={formData.subjects}
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
          value={formData.availability}
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
          value={formData.medicalNotes}
          onChange={(e) => handleFieldChange('medicalNotes', e.target.value)}
          onBlur={() => handleBlur('medicalNotes')}
          placeholder="Informations ou commentaires sur l'élève"
          maxLength={500}
          rows={3}
          state={validation.getFieldState('medicalNotes')}
          error={validation.getFieldError('medicalNotes')}
          helperText="Informations médicales importantes à connaître"
        />
      </div>
    </SlidePanelForm>
  );
};
