import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { TUTOR_STATUS_CONFIG } from './tutor-configs';
import type { TutorFilters } from './tutor-configs';
import { getSubjects } from '@/services/academic.service';

interface TutorFiltersContentProps {
  filters: TutorFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onToggleSubject: (subjectId: string) => void;
  onSetEstablishment: (id: string | undefined) => void;
  /** Toggle a weekday chip (multi-select). */
  onToggleDisponibilite: (day: string) => void;
  onSetExperienceRange: (min: number | undefined, max: number | undefined) => void;
  onSetEngagementStartDateRange?: (from: string | undefined, to: string | undefined) => void;
  onSetExitDateRange?: (from: string | undefined, to: string | undefined) => void;
  onSetExitReason?: (reason: string | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

// ─── Sub-components for each filter group ──────────────────────────────────────

const StatutFilter: React.FC<{
  filters: TutorFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(TUTOR_STATUS_CONFIG).map(([key, config]) => {
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
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
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

const MatiereFilter: React.FC<{
  filters: TutorFilters;
  onToggleSubject: (subjectId: string) => void;
}> = ({ filters, onToggleSubject }) => {
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', 'tutor-filters'],
    queryFn: async () => {
      const response = await getSubjects({ page: 1, pageSize: 100 });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="filter-group">
      <span className="filter-group-label">Matières</span>
      <div className="filter-options max-h-48 overflow-y-auto pr-1">
        {subjects.map((subject) => {
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
                isActive ? 'filter-option-primary--active' : 'filter-option-primary',
              )}
              onClick={() => onToggleSubject(subject.id)}
            >
              {subject.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const EtablissementFilter: React.FC<{
  filters: TutorFilters;
  onSetEstablishment: (id: string | undefined) => void;
}> = ({ filters, onSetEstablishment }) => {
  const { options, isLoading, onSearch } = useEstablishmentsAutocomplete();

  return (
    <div className="filter-group">
      <span className="filter-group-label">Établissement</span>
      <div className="w-64">
        <Autocomplete
          placeholder="Rechercher un établissement..."
          options={options}
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

function selectedDisponibiliteDays(filters: TutorFilters): string[] {
  const raw = filters.disponibilite;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return [raw];
  return [];
}

const DisponibiliteFilter: React.FC<{
  filters: TutorFilters;
  onToggleDisponibilite: (day: string) => void;
}> = ({ filters, onToggleDisponibilite }) => {
  const DAYS = [
    { value: 'monday', label: 'Lun' },
    { value: 'tuesday', label: 'Mar' },
    { value: 'wednesday', label: 'Mer' },
    { value: 'thursday', label: 'Jeu' },
    { value: 'friday', label: 'Ven' },
  ];

  const selectedDays = selectedDisponibiliteDays(filters);

  return (
    <div className="filter-group">
      <span className="filter-group-label">Disponibilité</span>
      <div className="filter-options">
        {DAYS.map((day) => {
          const isActive = selectedDays.includes(day.value);
          return (
            <Button
              key={day.value}
              variant="custom"
              size="sm"
              icon={Calendar}
              iconPosition="left"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-option-secondary--active' : 'filter-option-secondary',
              )}
              onClick={() => onToggleDisponibilite(day.value)}
            >
              {day.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const ExperienceFilter: React.FC<{
  filters: TutorFilters;
  onSetExperienceRange: (min: number | undefined, max: number | undefined) => void;
}> = ({ filters, onSetExperienceRange }) => {
  const min = filters.experienceRange?.min ?? '';
  const max = filters.experienceRange?.max ?? '';

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? Number.parseInt(e.target.value) : undefined;
    onSetExperienceRange(val, filters.experienceRange?.max);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? Number.parseInt(e.target.value) : undefined;
    onSetExperienceRange(filters.experienceRange?.min, val);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Expérience (années)</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min"
          className="text-sm py-1.5 px-3 rounded-lg w-20"
          value={min}
          onChange={handleMinChange}
          min={0}
        />
        <span className="text-sm text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max"
          className="text-sm py-1.5 px-3 rounded-lg w-20"
          value={max}
          onChange={handleMaxChange}
          min={0}
        />
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const DateEntreeFilter: React.FC<{
  filters: TutorFilters;
  onSetEngagementStartDateRange: (from: string | undefined, to: string | undefined) => void;
}> = ({ filters, onSetEngagementStartDateRange }) => {
  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleFromChange = (val: string) => {
    onSetEngagementStartDateRange(val || undefined, filters.engagementStartDateTo);
  };

  const handleToChange = (val: string) => {
    onSetEngagementStartDateRange(filters.engagementStartDateFrom, val || undefined);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date d'entrée</span>
      <div className="w-auto">
        <DateRangeInput
          startDate={filters.engagementStartDateFrom}
          endDate={filters.engagementStartDateTo}
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

const DateSortieFilter: React.FC<{
  filters: TutorFilters;
  onSetExitDateRange: (from: string | undefined, to: string | undefined) => void;
}> = ({ filters, onSetExitDateRange }) => {
  const handleFromChange = (val: string) => {
    onSetExitDateRange(val || undefined, filters.exitDateTo);
  };

  const handleToChange = (val: string) => {
    onSetExitDateRange(filters.exitDateFrom, val || undefined);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date de sortie</span>
      <div className="w-auto">
        <DateRangeInput
          startDate={filters.exitDateFrom}
          endDate={filters.exitDateTo}
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

const MotifSortieFilter: React.FC<{
  filters: TutorFilters;
  onSetExitReason: (reason: string | undefined) => void;
}> = ({ filters, onSetExitReason }) => (
  <div className="filter-group">
    <span className="filter-group-label">Motif de sortie</span>
    <div className="w-64">
      <Select
        key={filters.exitReason ?? '__empty__'}
        options={[
          { value: "Fin d'engagement anticipé", label: "Fin d'engagement anticipé" },
          { value: 'Ne donne pas suite', label: 'Ne donne pas suite' },
          { value: 'Autre', label: 'Autre' },
        ]}
        value={filters.exitReason ?? ''}
        onChange={(val) => onSetExitReason(val || undefined)}
        placeholder="Tous les motifs"
      />
    </div>
  </div>
);

export const TutorFiltersContent: React.FC<TutorFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onToggleSubject,
  onSetEstablishment,
  onToggleDisponibilite,
  onSetExperienceRange,
  onSetEngagementStartDateRange,
  onSetExitDateRange,
  onSetExitReason,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-matiere') && (
        <MatiereFilter filters={filters} onToggleSubject={onToggleSubject} />
      )}
      {show('filter-etablissement') && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}
      {show('filter-disponibilite') && (
        <DisponibiliteFilter filters={filters} onToggleDisponibilite={onToggleDisponibilite} />
      )}
      {/* {show('filter-experience') && (
        <ExperienceFilter filters={filters} onSetExperienceRange={onSetExperienceRange} />
      )} */}
      {show('filter-date-entree') && (
        <DateEntreeFilter
          filters={filters}
          onSetEngagementStartDateRange={onSetEngagementStartDateRange!}
        />
      )}
      {show('filter-date-sortie') && (
        <DateSortieFilter filters={filters} onSetExitDateRange={onSetExitDateRange!} />
      )}
      {show('filter-motif-sortie') && (
        <MotifSortieFilter filters={filters} onSetExitReason={onSetExitReason!} />
      )}
    </div>
  );
};
