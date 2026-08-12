import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, BookOpen, Baby, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { Input } from '@/components/forms/Input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { STUDENT_STATUS_CONFIG, EXIT_REASON_OPTIONS } from './student-configs';
import type { StudentFilters } from './student-configs';
import { getLevels, getSubjects, getSchoolClasses } from '@/services/academic.service';
import { getSpecialties } from '@/services/specialties.service';
import type { Level } from '@/types/level.types';
import type { Subject } from '@/types/subject.types';

interface StudentFiltersContentProps {
  filters: StudentFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onToggleGradeLevel: (levelId: string) => void;
  onToggleSubject: (subjectId: string) => void;
  onSetEstablishment: (id: string | undefined) => void;
  onSetClass: (classId: string | undefined) => void;
  onSetSpecialties?: (ids: string[]) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onToggleIsMinor: (value: boolean | undefined) => void;
  onToggleHasSpecialNeeds: (value: boolean | undefined) => void;
  onSetExitDateRange?: (from: Date | undefined, to: Date | undefined) => void;
  onSetExitReason?: (reason: string | undefined) => void;
  initialEstablishmentOption?: { value: string; label: string };
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const StatusFilter: React.FC<{
  filters: StudentFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(STUDENT_STATUS_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const isActive = filters.statuses.includes(key);
        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            icon={Icon}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isActive ? 'filter-badge-active' : 'filter-badge-inactive',
            )}
            style={
              {
                '--filter-color': config.badgeColor ?? 'rgb(var(--status-success))',
              } as React.CSSProperties
            }
            onClick={() => onToggleStatus(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const GradeLevelFilter: React.FC<{
  filters: StudentFilters;
  onToggleGradeLevel: (levelId: string) => void;
  enabled: boolean;
}> = ({ filters, onToggleGradeLevel, enabled }) => {
  const { data: levels = [], isLoading } = useQuery<Level[]>({
    queryKey: ['levels'],
    queryFn: async () => {
      const response = await getLevels();
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="filter-group">
      <span className="filter-group-label">Niveau scolaire</span>
      <div className="filter-options">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Chargement...</span>
        ) : (
          levels.map((level) => {
            const isActive = filters.levelIds.includes(level.id);
            return (
              <Button
                key={level.id}
                variant="custom"
                size="sm"
                icon={GraduationCap}
                iconPosition="left"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                  isActive ? 'filter-option-secondary--active' : 'filter-option-secondary',
                )}
                onClick={() => onToggleGradeLevel(level.id)}
              >
                {level.label}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
};

const SubjectFilter: React.FC<{
  filters: StudentFilters;
  onToggleSubject: (subjectId: string) => void;
  enabled: boolean;
}> = ({ filters, onToggleSubject, enabled }) => {
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="filter-group">
      <span className="filter-group-label">Matières</span>
      <div className="filter-options">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Chargement...</span>
        ) : (
          subjects.map((subject) => {
            const isActive = filters.subjects.includes(subject.id);
            return (
              <Button
                key={subject.id}
                variant="custom"
                size="sm"
                icon={BookOpen}
                iconPosition="left"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                  isActive ? 'filter-option-tertiary--active' : 'filter-option-tertiary',
                )}
                onClick={() => onToggleSubject(subject.id)}
              >
                {subject.label}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
};

const ClasseFilter: React.FC<{
  filters: StudentFilters;
  onSetClass: (classId: string | undefined) => void;
}> = ({ filters, onSetClass }) => {
  const isEnabled = !!filters.establishmentId;
  const disabledTooltip = "Sélectionnez d'abord un établissement";

  const { data: classesRes, isLoading } = useQuery({
    queryKey: ['school-classes-filter', filters.establishmentId],
    queryFn: () =>
      getSchoolClasses({
        establishmentId: filters.establishmentId,
        pageSize: 200,
      }),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const options = (classesRes?.data ?? []).map((cls) => ({ value: cls.id, label: cls.name }));
  const currentValue = filters.classIds[0] ?? '';

  return (
    <div className="filter-group">
      <span className="filter-group-label">Classe</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-64 block" style={{ pointerEvents: 'auto' }}>
              <Select
                options={options}
                value={currentValue}
                onChange={(val) => onSetClass(val || undefined)}
                placeholder={isLoading ? 'Chargement...' : 'Toutes les classes'}
                disabled={!isEnabled}
              />
            </span>
          </TooltipTrigger>
          {!isEnabled && <TooltipContent side="top">{disabledTooltip}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const SpecialtyFilter: React.FC<{
  filters: StudentFilters;
  onSetSpecialties: (ids: string[]) => void;
}> = ({ filters, onSetSpecialties }) => {
  const { data: specialties = [], isLoading } = useQuery({
    queryKey: ['specialties', 'active'],
    queryFn: () => getSpecialties(true),
    staleTime: 10 * 60 * 1000,
  });

  const options = specialties.map((s) => ({ value: s.id, label: s.label }));

  return (
    <div className="filter-group">
      <span className="filter-group-label">Spécialités</span>
      <div className="w-64">
        <MultiSelect
          options={options}
          value={filters.specialtyIds}
          onChange={onSetSpecialties}
          placeholder={isLoading ? 'Chargement...' : 'Toutes les spécialités'}
        />
      </div>
    </div>
  );
};

const EtablissementFilter: React.FC<{
  filters: StudentFilters;
  onSetEstablishment: (id: string | undefined) => void;
  initialEstablishmentOption?: { value: string; label: string };
}> = ({ filters, onSetEstablishment, initialEstablishmentOption }) => {
  const { options, isLoading, onSearch } = useEstablishmentsAutocomplete();

  const enrichedOptions = React.useMemo(() => {
    if (!initialEstablishmentOption) return options;
    const alreadyInList = options.some((o) => o.value === initialEstablishmentOption.value);
    return alreadyInList ? options : [initialEstablishmentOption, ...options];
  }, [options, initialEstablishmentOption]);

  return (
    <div className="filter-group">
      <span className="filter-group-label">Établissement</span>
      <div className="w-64">
        <Autocomplete
          placeholder="Rechercher un établissement..."
          options={enrichedOptions}
          value={filters.establishmentId ?? ''}
          onChange={(val) => onSetEstablishment(val || undefined)}
          onSearch={onSearch}
          isLoading={isLoading}
          minSearchLength={2}
        />
      </div>
    </div>
  );
};

const DateInscriptionFilter: React.FC<{
  filters: StudentFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetCustomDateRange }) => {
  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fromStr = toDateString(filters.createdFrom);
  const toStr = toDateString(filters.createdTo);

  const handleFromChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(undefined, filters.createdTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onSetCustomDateRange(d, filters.createdTo);
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(filters.createdFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    onSetCustomDateRange(filters.createdFrom, d);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date d'inscription</span>
      <div className="w-auto">
        <DateRangeInput
          startDate={fromStr}
          endDate={toStr}
          onStartDateChange={handleFromChange}
          onEndDateChange={handleToChange}
          layout="horizontal"
          showConnector={true}
          showPresets={false}
          hidePickerLabels={true}
          compact={true}
        />
      </div>
    </div>
  );
};

const ProfileFilter: React.FC<{
  filters: StudentFilters;
  showIsMinor: boolean;
  showSpecialNeeds: boolean;
  onToggleIsMinor: (value: boolean | undefined) => void;
  onToggleHasSpecialNeeds: (value: boolean | undefined) => void;
}> = ({ filters, showIsMinor, showSpecialNeeds, onToggleIsMinor, onToggleHasSpecialNeeds }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Profil</span>
      <div className="filter-options">
        {showIsMinor && (
          <Button
            variant="custom"
            size="sm"
            icon={Baby}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              filters.isMinor === true ? 'filter-option-primary--active' : 'filter-option-primary',
            )}
            onClick={() => onToggleIsMinor(filters.isMinor === true ? undefined : true)}
          >
            Mineur
          </Button>
        )}
        {showSpecialNeeds && (
          <Button
            variant="custom"
            size="sm"
            icon={Heart}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              filters.hasSpecialNeeds === true
                ? 'filter-option-tertiary--active'
                : 'filter-option-tertiary',
            )}
            onClick={() =>
              onToggleHasSpecialNeeds(filters.hasSpecialNeeds === true ? undefined : true)
            }
          >
            Besoins spécifiques
          </Button>
        )}
      </div>
    </div>
  );
};

const ExitDateFilter: React.FC<{
  filters: StudentFilters;
  onSetExitDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetExitDateRange }) => {
  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fromStr = toDateString(filters.exitDateFrom);
  const toStr = toDateString(filters.exitDateTo);

  const handleFromChange = (val: string) => {
    if (!val) {
      onSetExitDateRange(undefined, filters.exitDateTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onSetExitDateRange(d, filters.exitDateTo);
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetExitDateRange(filters.exitDateFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    onSetExitDateRange(filters.exitDateFrom, d);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date de sortie</span>
      <div className="w-auto">
        <DateRangeInput
          startDate={fromStr}
          endDate={toStr}
          onStartDateChange={handleFromChange}
          onEndDateChange={handleToChange}
          layout="horizontal"
          showConnector={true}
          showPresets={false}
          hidePickerLabels={true}
          compact={true}
        />
      </div>
    </div>
  );
};

const ExitReasonFilter: React.FC<{
  filters: StudentFilters;
  onSetExitReason: (reason: string | undefined) => void;
}> = ({ filters, onSetExitReason }) => (
  <div className="filter-group">
    <span className="filter-group-label">Motif de sortie</span>
    <div className="w-64">
      <Select
        key={filters.exitReason ?? '__empty__'}
        value={filters.exitReason ?? ''}
        onChange={(v) => onSetExitReason(v || undefined)}
        placeholder="Tous les motifs"
        options={[...EXIT_REASON_OPTIONS]}
      />
    </div>
  </div>
);

export const StudentFiltersContent: React.FC<StudentFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onToggleGradeLevel,
  onToggleSubject,
  onSetEstablishment,
  onSetClass,
  onSetSpecialties,
  onSetCustomDateRange,
  onToggleIsMinor,
  onToggleHasSpecialNeeds,
  onSetExitDateRange,
  onSetExitReason,
  initialEstablishmentOption,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatusFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-grade-level') && (
        <GradeLevelFilter
          filters={filters}
          onToggleGradeLevel={onToggleGradeLevel}
          enabled={true}
        />
      )}
      {show('filter-subject') && (
        <SubjectFilter filters={filters} onToggleSubject={onToggleSubject} enabled={true} />
      )}
      {show('filter-etablissement') && (
        <EtablissementFilter
          filters={filters}
          onSetEstablishment={onSetEstablishment}
          initialEstablishmentOption={initialEstablishmentOption}
        />
      )}
      {show('filter-classe') && <ClasseFilter filters={filters} onSetClass={onSetClass} />}
      {show('filter-specialties') && onSetSpecialties && (
        <SpecialtyFilter filters={filters} onSetSpecialties={onSetSpecialties} />
      )}
      {show('filter-dates') && (
        <DateInscriptionFilter filters={filters} onSetCustomDateRange={onSetCustomDateRange} />
      )}
      {(show('filter-is-minor') || show('filter-special-needs')) && (
        <ProfileFilter
          filters={filters}
          showIsMinor={show('filter-is-minor')}
          showSpecialNeeds={show('filter-special-needs')}
          onToggleIsMinor={onToggleIsMinor}
          onToggleHasSpecialNeeds={onToggleHasSpecialNeeds}
        />
      )}
      {show('filter-exit-date') && onSetExitDateRange && (
        <ExitDateFilter filters={filters} onSetExitDateRange={onSetExitDateRange} />
      )}
      {show('filter-exit-reason') && onSetExitReason && (
        <ExitReasonFilter filters={filters} onSetExitReason={onSetExitReason} />
      )}
    </div>
  );
};
