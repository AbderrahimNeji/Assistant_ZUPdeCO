import * as React from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/forms/Input';
import { Select, SelectOption } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DatePicker } from '@/components/forms/DatePicker';
import { TimePicker } from '@/components/forms/TimePicker';
import { InlineActivityForm } from './InlineActivityForm';
import { InlineActivityTypeForm } from './InlineActivityTypeForm';
import { Button } from '@/components/forms/Button';
import { Checkbox } from '@/components/forms/Checkbox';
import { Calendar, MapPin, BookOpen, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import {
  ESTABLISHMENT_SEARCH_HINT,
  formatEstablishmentSelectLabel,
} from '@/utils/formatEstablishmentSelectLabel';
import type { UseFormValidationReturn } from '@/hooks/useFormValidation';
import type {
  SessionType,
  SessionFormat,
  SessionMode,
  RecurrenceType,
  PlanificationType,
} from '@/types/session.types';
import { COLLECTIVE_SESSION_TYPE_VALUES } from '@/types/session.types';

export { COLLECTIVE_SESSION_TYPE_VALUES };
import type { UserWithProfile } from '@/types/user.types';
import type { Establishment } from '@/types/establishment.types';
import type { Room } from '@/types/room.types';
import type { Level } from '@/types/level.types';
import type { Subject } from '@/types/subject.types';
import type { Program } from '@/types/program.types';
import type {
  Activity,
  ActivityType,
  CreateActivityDto,
  CreateActivityTypeDto,
} from '@/types/activity.types';

interface SessionFormData {
  establishmentId: string;
  roomId: string;
  programId: string;
  levelIds: string[];
  subjectIds: string[];
  classId: string;
  specialtyIds: string[];
  activityId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  type: SessionType | '';
  sessionFormat: SessionFormat | '';
  mode: SessionMode | '';
  recurrenceType: RecurrenceType;
  recurrenceRule: Record<string, unknown> | null;
  topic: string;
  joinLink: string;
  /** Allow scheduling on dates that fall on company holidays / vacation (API: planDuringHolidays). */
  planDuringHolidays: boolean;
  internalNotes: string;
}

interface SessionFormCenterProps {
  formData: SessionFormData;
  onChange: (
    field: keyof SessionFormData,
    value: string | string[] | boolean | Record<string, unknown> | null,
  ) => void;
  onBlur?: (field: string) => void;
  validation?: UseFormValidationReturn;
  tutors: UserWithProfile[];
  students: UserWithProfile[];
  establishments: Establishment[];
  rooms: Room[];
  levels: Level[];
  subjects: Subject[];
  programs: Program[];
  activities: Activity[];
  activityTypes: ActivityType[];
  showActivityForm: boolean;
  setShowActivityForm: (show: boolean) => void;
  showActivityTypeForm: boolean;
  setShowActivityTypeForm: (show: boolean) => void;
  newActivityData: Partial<CreateActivityDto>;
  setNewActivityData: React.Dispatch<React.SetStateAction<Partial<CreateActivityDto>>>;
  newActivityTypeData: Partial<CreateActivityTypeDto>;
  setNewActivityTypeData: React.Dispatch<React.SetStateAction<Partial<CreateActivityTypeDto>>>;
  activityValidation: UseFormValidationReturn;
  activityTypeValidation: UseFormValidationReturn;
  disablePastDate?: boolean;
  className?: string;
  schoolClasses?: { id: string; name: string }[];
  specialtyOptions?: { value: string; label: string }[];
  isLycee?: boolean;
  /** Filtre les options du "Type de séance" selon le type de planification choisi en amont. */
  planificationType?: PlanificationType;
  /** Établissement sélectionné (ex. chargé via GET /establishments/:id en édition). */
  selectedEstablishment?: Establishment | null;
}

const ALL_SESSION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'homework_help', label: 'Aide aux devoirs' },
  { value: 'individual_tutoring', label: 'Tutorat individuel' },
  { value: 'workshop', label: 'Atelier' },
  { value: 'whole_class', label: 'Classe entière' },
  { value: 'group_tutoring', label: 'Tutorat' },
];

const INDIVIDUAL_SESSION_TYPE_VALUES: SessionType[] = ['individual_tutoring'];

const getSessionTypeOptions = (planificationType?: PlanificationType): SelectOption[] => {
  if (planificationType === 'individual') {
    return ALL_SESSION_TYPE_OPTIONS.filter((opt) =>
      INDIVIDUAL_SESSION_TYPE_VALUES.includes(opt.value as SessionType),
    );
  }
  if (planificationType === 'collective') {
    return ALL_SESSION_TYPE_OPTIONS.filter((opt) =>
      COLLECTIVE_SESSION_TYPE_VALUES.includes(opt.value as SessionType),
    );
  }
  return ALL_SESSION_TYPE_OPTIONS;
};

const sessionFormatOptions: SelectOption[] = [
  { value: 'in_person', label: 'Présentiel' },
  { value: 'remote', label: 'À distance' },
  { value: 'hybrid', label: 'Hybride' },
];

const sessionModeOptions: SelectOption[] = [
  { value: 'single', label: 'Séance unique' },
  { value: 'recurring', label: 'Récurrente' },
];

const recurrenceTypeOptions: SelectOption[] = [
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'several_days_per_week', label: 'Plusieurs jours/semaine' },
  // { value: 'biweekly', label: 'Bi-hebdomadaire' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'ab', label: 'Bi-mensuelle (semaines A/B)' },
];

export const SessionFormCenter: React.FC<SessionFormCenterProps> = ({
  formData,
  onChange,
  onBlur,
  validation,
  tutors,
  students,
  establishments,
  rooms,
  levels,
  subjects,
  programs,
  activities,
  activityTypes,
  showActivityForm,
  setShowActivityForm,
  showActivityTypeForm,
  setShowActivityTypeForm,
  newActivityData,
  setNewActivityData,
  newActivityTypeData,
  setNewActivityTypeData,
  activityValidation,
  activityTypeValidation,
  disablePastDate = true,
  className,
  schoolClasses = [],
  specialtyOptions = [],
  isLycee = false,
  planificationType,
  selectedEstablishment,
}) => {
  const sessionTypeOptions = React.useMemo(
    () => getSessionTypeOptions(planificationType),
    [planificationType],
  );
  const isSessionTypeLocked = planificationType === 'individual';

  // Hook pour autocomplete établissements paginé
  const {
    options: establishmentSearchOptions,
    isLoading: establishmentSearchLoading,
    onSearch: handleEstablishmentSearch,
  } = useEstablishmentsAutocomplete();

  // Enrichir les options avec l'établissement actuel s'il n'est pas dans la recherche paginée
  const enrichedEstablishmentOptions = React.useMemo(() => {
    const id = formData.establishmentId;
    if (!id) return establishmentSearchOptions;

    const existsInSearch = establishmentSearchOptions.some((opt) => opt.value === id);
    if (existsInSearch) return establishmentSearchOptions;

    const fromList = establishments.find((e) => e.id === id);
    const resolved =
      fromList ?? (selectedEstablishment?.id === id ? selectedEstablishment : undefined);
    if (!resolved) return establishmentSearchOptions;

    return [
      { value: resolved.id, label: formatEstablishmentSelectLabel(resolved) },
      ...establishmentSearchOptions,
    ];
  }, [formData.establishmentId, establishments, establishmentSearchOptions, selectedEstablishment]);

  const getMinTimeForDate = (): string | undefined => {
    if (!formData.sessionDate) return undefined;

    const today = format(new Date(), 'yyyy-MM-dd');
    if (formData.sessionDate === today) {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    return undefined;
  };

  const getMinTimeForEndTime = (): string | undefined => {
    if (!formData.startTime) return undefined;
    return formData.startTime;
  };

  const lastAutoEndTimeRef = React.useRef<string>('');

  const addOneHour = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + 60;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (value: string) => {
    onChange('startTime', value);
    if (value) {
      const autoEnd = addOneHour(value);
      lastAutoEndTimeRef.current = autoEnd;
      onChange('endTime', autoEnd);
    }
  };

  const roomOptions: SelectOption[] = [
    { value: '', label: 'Sélectionner une salle' },
    ...rooms
      .filter((r) => !formData.establishmentId || r.establishmentId === formData.establishmentId)
      .map((r) => ({
        value: r.id,
        label: r.label || r.name,
      })),
  ];

  const levelMultiOptions: SelectOption[] = levels.map((l) => ({
    value: l.id,
    label: l.label,
  }));

  const subjectMultiOptions: SelectOption[] = subjects.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  const programOptions: SelectOption[] = [
    { value: '', label: 'Sélectionner un programme' },
    ...programs.map((p) => ({
      value: p.id,
      label: p.name,
    })),
  ];

  const activityOptions: SelectOption[] = [
    { value: '', label: 'Sélectionner une activité' },
    ...activities.map((a) => ({
      value: a.id,
      label: a.label,
    })),
  ];

  const activityTypeOptions: SelectOption[] = [
    { value: '', label: 'Sélectionner un type' },
    ...activityTypes.map((at) => ({
      value: at.id,
      label: at.label,
    })),
  ];

  const showRecurrence = formData.mode === 'recurring';
  const showJoinLink = formData.sessionFormat === 'remote' || formData.sessionFormat === 'hybrid';

  return (
    <div className={cn('section-card h-full flex flex-col min-h-0', className)}>
      <div className="section-header flex-shrink-0">
        {(tutors.length > 0 || students.length > 0) && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-2-nuance-1)]">
            <Users className="w-3.5 h-3.5" />
            <span>{tutors.length + students.length} participant(s)</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin">
        <div className="space-y-6">
          {/* Informations générales */}
          <div className="form-section">
            <h4 className="form-section-title">
              <BookOpen className="w-4 h-4" />
              Informations générales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Type de séance"
                placeholder="Sélectionner un type"
                options={sessionTypeOptions}
                value={formData.type}
                onChange={(value) => onChange('type', value)}
                onBlur={() => onBlur?.('type')}
                state={validation?.getFieldState('type')}
                error={validation?.getFieldError('type')}
                required
                size="sm"
                disabled={isSessionTypeLocked}
              />
              <Select
                label="Format"
                placeholder="Sélectionner un format"
                options={sessionFormatOptions}
                value={formData.sessionFormat}
                onChange={(value) => onChange('sessionFormat', value)}
                onBlur={() => onBlur?.('sessionFormat')}
                state={validation?.getFieldState('sessionFormat')}
                error={validation?.getFieldError('sessionFormat')}
                required
                size="sm"
              />
              <Select
                label="Mode"
                placeholder="Sélectionner un mode"
                options={sessionModeOptions}
                value={formData.mode}
                onChange={(value) => onChange('mode', value)}
                onBlur={() => onBlur?.('mode')}
                state={validation?.getFieldState('mode')}
                error={validation?.getFieldError('mode')}
                required
                size="sm"
              />
              {showRecurrence && (
                <Select
                  label="Récurrence"
                  placeholder="Sélectionner une récurrence"
                  options={recurrenceTypeOptions}
                  value={formData.recurrenceType}
                  onChange={(value) => onChange('recurrenceType', value)}
                  onBlur={() => onBlur?.('recurrenceType')}
                  state={validation?.getFieldState('recurrenceType')}
                  error={validation?.getFieldError('recurrenceType')}
                  required
                  size="sm"
                />
              )}
            </div>

            {/* Sélecteur de jours pour récurrence plusieurs jours/semaine */}
            {showRecurrence && formData.recurrenceType === 'several_days_per_week' && (
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Jours de la semaine <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { day: 1, label: 'Lun' },
                    { day: 2, label: 'Mar' },
                    { day: 3, label: 'Mer' },
                    { day: 4, label: 'Jeu' },
                    { day: 5, label: 'Ven' },
                    { day: 6, label: 'Sam' },
                    { day: 7, label: 'Dim' },
                  ].map(({ day, label }) => {
                    const weekDays = (formData.recurrenceRule?.weekDays as number[]) || [];
                    const isActive = weekDays.includes(day);
                    return (
                      <Button
                        key={day}
                        variant="custom"
                        size="sm"
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                          isActive ? 'filter-badge-active' : 'filter-badge-inactive',
                        )}
                        style={
                          { '--filter-color': 'var(--color-2-nuance-1)' } as React.CSSProperties
                        }
                        onClick={() => {
                          const currentWeekDays =
                            (formData.recurrenceRule?.weekDays as number[]) || [];
                          const newWeekDays = isActive
                            ? currentWeekDays.filter((d) => d !== day)
                            : [...currentWeekDays, day].sort((a, b) => a - b);
                          onChange('recurrenceRule', {
                            ...formData.recurrenceRule,
                            weekDays: newWeekDays,
                          });
                        }}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
                {validation?.getFieldError('recurrenceRule') && (
                  <p className="text-xs text-red-500 mt-1">
                    {validation.getFieldError('recurrenceRule')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Date et horaires */}
          <div className="form-section">
            <h4 className="form-section-title">
              <Calendar className="w-4 h-4" />
              Date et horaires
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DatePicker
                label={
                  formData.recurrenceType === 'several_days_per_week'
                    ? 'Date début récurrence'
                    : 'Date'
                }
                value={formData.sessionDate}
                onChange={(value) => onChange('sessionDate', value)}
                onBlur={() => onBlur?.('sessionDate')}
                state={validation?.getFieldState('sessionDate')}
                error={validation?.getFieldError('sessionDate')}
                required
                inputSize="sm"
                disablePast={disablePastDate}
              />
              <TimePicker
                label="Heure de début"
                value={formData.startTime}
                onChange={handleStartTimeChange}
                error={validation?.getFieldError('startTime')}
                required
                placeholder="hh:mm"
                minTime={getMinTimeForDate()}
                step={1}
                showQuickSelect={true}
                inputSize="sm"
              />
              <TimePicker
                label="Heure de fin"
                value={formData.endTime}
                onChange={(value) => onChange('endTime', value)}
                error={validation?.getFieldError('endTime')}
                required
                placeholder="hh:mm"
                minTime={getMinTimeForEndTime()}
                step={1}
                showQuickSelect={true}
                inputSize="sm"
              />
            </div>

            <div className="mt-4 [&_.form-label]:text-sm [&_.form-helper-text]:text-xs">
              <Checkbox
                label="Autoriser la planification pendant les vacances et jours fériés"
                checked={formData.planDuringHolidays}
                onCheckedChange={(checked) => onChange('planDuringHolidays', checked === true)}
                onBlur={() => onBlur?.('planDuringHolidays')}
                helperText="Si décoché, les dates couvertes par le calendrier vacances / jours fériés de l'entreprise seront refusées."
              />
            </div>
          </div>

          {/* Lieu et contexte */}
          <div className="form-section">
            <h4 className="form-section-title">
              <MapPin className="w-4 h-4" />
              Lieu et contexte
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Autocomplete
                label="Établissement"
                placeholder="Rechercher un établissement..."
                options={enrichedEstablishmentOptions}
                value={formData.establishmentId}
                onChange={(value) => onChange('establishmentId', value)}
                onSearch={handleEstablishmentSearch}
                isLoading={establishmentSearchLoading}
                onBlur={() => onBlur?.('establishmentId')}
                state={validation?.getFieldState('establishmentId')}
                error={validation?.getFieldError('establishmentId')}
                helperText={ESTABLISHMENT_SEARCH_HINT}
                required
                minSearchLength={2}
              />
              <Select
                label="Salle"
                placeholder="Sélectionner une salle"
                options={roomOptions}
                value={formData.roomId}
                onChange={(value) => onChange('roomId', value)}
                onBlur={() => onBlur?.('roomId')}
                state={validation?.getFieldState('roomId')}
                error={validation?.getFieldError('roomId')}
                size="sm"
                disabled={!formData.establishmentId}
              />
              <Select
                label="Programme"
                placeholder="Sélectionner un programme"
                options={programOptions}
                value={formData.programId}
                onChange={(value) => onChange('programId', value)}
                onBlur={() => onBlur?.('programId')}
                state={validation?.getFieldState('programId')}
                error={validation?.getFieldError('programId')}
                size="sm"
              />

              {/* Activité : Select OU Formulaire inline */}
              {showActivityForm ? (
                <div className="col-span-2 space-y-4">
                  {/* Formulaire Activité */}
                  <InlineActivityForm
                    newActivityData={newActivityData}
                    setNewActivityData={setNewActivityData}
                    showActivityTypeForm={showActivityTypeForm}
                    setShowActivityTypeForm={setShowActivityTypeForm}
                    activityTypeOptions={activityTypeOptions}
                    activityValidation={activityValidation}
                    onClose={() => {
                      setNewActivityData({
                        code: '',
                        label: '',
                        description: '',
                        canHasCr: false,
                        bot: false,
                        withLink: false,
                        chat: false,
                        status: 'active',
                      });
                      setNewActivityTypeData({
                        code: '',
                        label: '',
                        description: '',
                        status: 'active',
                      });
                      setShowActivityTypeForm(false);
                      setShowActivityForm(false);
                      onChange('activityId', '');
                    }}
                    onValidate={() => {
                      const activityValid = activityValidation.validateForm(newActivityData);
                      const activityTypeValid = showActivityTypeForm
                        ? activityTypeValidation.validateForm(newActivityTypeData)
                        : true;

                      if (!activityValid || !activityTypeValid) {
                        toast.error('Veuillez remplir tous les champs obligatoires');
                        return;
                      }

                      setShowActivityForm(false);
                      toast.success('Activité prête à être créée avec la séance');
                    }}
                  />

                  {/* Formulaire Type d'Activité - EN DESSOUS du formulaire Activité */}
                  {showActivityTypeForm && (
                    <div className="ml-6 border-l border-[var(--color-2-nuance-1)] pl-4">
                      <InlineActivityTypeForm
                        newActivityTypeData={newActivityTypeData}
                        setNewActivityTypeData={setNewActivityTypeData}
                        activityTypeValidation={activityTypeValidation}
                        onClose={() => {
                          setNewActivityTypeData({
                            code: '',
                            label: '',
                            description: '',
                            status: 'active',
                          });
                          setShowActivityTypeForm(false);
                        }}
                        onValidate={() => {
                          const activityTypeValid =
                            activityTypeValidation.validateForm(newActivityTypeData);

                          if (!activityTypeValid) {
                            toast.error(
                              "Veuillez remplir tous les champs obligatoires du type d'activité",
                            );
                            return;
                          }

                          toast.success("Type d'activité prêt à être créé avec la séance");
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Select
                    label="Activité"
                    placeholder="Sélectionner une activité"
                    options={activityOptions}
                    value={formData.activityId}
                    onChange={(value) => onChange('activityId', value)}
                    onBlur={() => onBlur?.('activityId')}
                    state={validation?.getFieldState('activityId')}
                    error={validation?.getFieldError('activityId')}
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    iconPosition="left"
                    onClick={() => setShowActivityForm(true)}
                  >
                    Créer une nouvelle activité
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Détails académiques */}
          <div className="form-section">
            <h4 className="form-section-title">
              <BookOpen className="w-4 h-4" />
              Détails académiques
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelect
                label="Niveaux"
                placeholder="Sélectionner un ou plusieurs niveaux"
                options={levelMultiOptions}
                value={formData.levelIds}
                onChange={(values) => onChange('levelIds', values)}
                onBlur={() => onBlur?.('levelIds')}
                state={validation?.getFieldState('levelIds')}
                error={validation?.getFieldError('levelIds')}
                maxVisibleTags={3}
                inputSize="sm"
              />
              <MultiSelect
                label="Matières"
                placeholder="Sélectionner une ou plusieurs matières"
                options={subjectMultiOptions}
                value={formData.subjectIds}
                onChange={(values) => onChange('subjectIds', values)}
                onBlur={() => onBlur?.('subjectIds')}
                state={validation?.getFieldState('subjectIds')}
                error={validation?.getFieldError('subjectIds')}
                required
                maxVisibleTags={3}
                inputSize="sm"
              />
              {formData.establishmentId && formData.levelIds.length > 0 && (
                <Select
                  label="Classe (optionnel)"
                  placeholder="Toutes les classes"
                  options={schoolClasses.map((sc) => ({ value: sc.id, label: sc.name }))}
                  value={formData.classId}
                  onChange={(val) => onChange('classId', val)}
                  onBlur={() => onBlur?.('classId')}
                />
              )}
              {isLycee && formData.levelIds.length > 0 && specialtyOptions.length > 0 && (
                <MultiSelect
                  label="Spécialités (optionnel)"
                  placeholder="Sélectionner des spécialités"
                  options={specialtyOptions}
                  value={formData.specialtyIds}
                  onChange={(values) => onChange('specialtyIds', values)}
                  onBlur={() => onBlur?.('specialtyIds')}
                  maxVisibleTags={3}
                />
              )}
              <Input
                label="Sujet"
                placeholder="Ex: Révision mathématiques"
                value={formData.topic}
                onChange={(e) => onChange('topic', e.target.value)}
                onBlur={() => onBlur?.('topic')}
                state={validation?.getFieldState('topic')}
                error={validation?.getFieldError('topic')}
                helperText="Sujet ou thème principal de la séance"
                maxLength={255}
                inputSize="sm"
              />
            </div>
          </div>

          {/* Lien de visio */}
          {showJoinLink && (
            <div className="form-section">
              <Input
                label="Lien de visioconférence"
                placeholder="Ex: https://meet.google.com/abc-defg-hij"
                value={formData.joinLink}
                onChange={(e) => onChange('joinLink', e.target.value)}
                onBlur={() => onBlur?.('joinLink')}
                state={validation?.getFieldState('joinLink')}
                error={validation?.getFieldError('joinLink')}
                required={formData.sessionFormat === 'remote'}
                maxLength={500}
                inputSize="sm"
              />
            </div>
          )}

          {/* Notes internes */}
          <div className="form-section">
            <Input
              label="Notes internes"
              placeholder="Ex: Élève en difficulté, prévoir support"
              value={formData.internalNotes}
              onChange={(e) => onChange('internalNotes', e.target.value)}
              onBlur={() => onBlur?.('internalNotes')}
              state={validation?.getFieldState('internalNotes')}
              error={validation?.getFieldError('internalNotes')}
              helperText="Notes privées visibles par les administrateurs"
              maxLength={1000}
              inputSize="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
