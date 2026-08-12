import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { PAIR_TYPE_CONFIG } from './pair-configs';
import type { PairFilters } from './pair-configs';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { getSubjects } from '@/services/academic.service';
import type { Subject } from '@/types/subject.types';

interface PairFiltersContentProps {
  filters: PairFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleType: (type: string) => void;
  onSetTutorSearch: (search: string | undefined) => void;
  onSetStudentSearch: (search: string | undefined) => void;
  onSetDateRange: (range: PairFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetEstablishment: (id: string | undefined) => void;
  onSetSubject: (id: string | undefined) => void;
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
] as const;

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

// ─── Sub-components for each filter group ──────────────────────────────────────

const TypeFilter: React.FC<{
  filters: PairFilters;
  onToggleType: (type: string) => void;
}> = ({ filters, onToggleType }) => (
  <div className="filter-group">
    <span className="filter-group-label">Type de matching</span>
    <div className="filter-options">
      {Object.entries(PAIR_TYPE_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const isActive = filters.types.includes(key);
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
            style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
            onClick={() => onToggleType(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const TutorSearchFilter: React.FC<{
  filters: PairFilters;
  onSetTutorSearch: (search: string | undefined) => void;
}> = ({ filters, onSetTutorSearch }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche tuteur</span>
    <Input
      type="text"
      placeholder="Nom, email ou téléphone..."
      className="text-sm py-1.5 px-3 rounded-lg min-w-64"
      value={filters.tutorSearch ?? ''}
      onChange={(e) => onSetTutorSearch(e.target.value || undefined)}
    />
  </div>
);

const StudentSearchFilter: React.FC<{
  filters: PairFilters;
  onSetStudentSearch: (search: string | undefined) => void;
}> = ({ filters, onSetStudentSearch }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche élève</span>
    <Input
      type="text"
      placeholder="Nom, email ou téléphone..."
      className="text-sm py-1.5 px-3 rounded-lg min-w-64"
      value={filters.studentSearch ?? ''}
      onChange={(e) => onSetStudentSearch(e.target.value || undefined)}
    />
  </div>
);

const PeriodeFilter: React.FC<{
  filters: PairFilters;
  onSetDateRange: (range: PairFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetDateRange, onSetCustomDateRange }) => (
  <div className="filter-group">
    <span className="filter-group-label">Période</span>
    <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
      {PERIOD_OPTIONS.map((option, index) => {
        const isActive = filters.dateRange === option.value && !filters.customDateFrom;
        const isLast = index === PERIOD_OPTIONS.length - 1;
        return (
          <Button
            key={option.value}
            variant="custom"
            size="sm"
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-all border-0',
              !isLast && 'border-r border-[var(--color-2-nuance-1)]',
              isActive ? 'session-period-btn--active' : 'session-period-btn',
            )}
            onClick={() => {
              onSetDateRange(option.value);
              onSetCustomDateRange(undefined, undefined);
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const DateRangeFilter: React.FC<{
  filters: PairFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetDateRange: (range: PairFilters['dateRange']) => void;
}> = ({ filters, onSetCustomDateRange, onSetDateRange }) => {
  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fromStr = toDateString(filters.customDateFrom);
  const toStr = toDateString(filters.customDateTo);

  const handleFromChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(undefined, filters.customDateTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onSetCustomDateRange(d, filters.customDateTo);
    onSetDateRange('all');
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(filters.customDateFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59);
    onSetCustomDateRange(filters.customDateFrom, d);
    onSetDateRange('all');
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date personnalisée</span>
      <div className="w-auto mt-0.5">
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

const EtablissementFilter: React.FC<{
  filters: PairFilters;
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

const MatiereFilter: React.FC<{
  filters: PairFilters;
  onSetSubject: (id: string | undefined) => void;
  enabled: boolean;
}> = ({ filters, onSetSubject, enabled }) => {
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const selectOptions = [
    { value: '', label: 'Toutes' },
    ...subjects.map((s) => ({ value: s.id, label: s.label })),
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Matière</span>
      <Select
        options={selectOptions}
        value={filters.subjectId ?? ''}
        onChange={(val) => onSetSubject(val || undefined)}
        disabled={isLoading}
        size="sm"
        className="min-w-36"
      />
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const PairFiltersContent: React.FC<PairFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleType,
  onSetTutorSearch,
  onSetStudentSearch,
  onSetDateRange,
  onSetCustomDateRange,
  onSetEstablishment,
  onSetSubject,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-type') && <TypeFilter filters={filters} onToggleType={onToggleType} />}

      {show('filter-tutor-search') && (
        <TutorSearchFilter filters={filters} onSetTutorSearch={onSetTutorSearch} />
      )}

      {show('filter-student-search') && (
        <StudentSearchFilter filters={filters} onSetStudentSearch={onSetStudentSearch} />
      )}

      {show('filter-periode') && (
        <PeriodeFilter
          filters={filters}
          onSetDateRange={onSetDateRange}
          onSetCustomDateRange={onSetCustomDateRange}
        />
      )}

      {show('filter-date-range') && (
        <DateRangeFilter
          filters={filters}
          onSetCustomDateRange={onSetCustomDateRange}
          onSetDateRange={onSetDateRange}
        />
      )}

      {show('filter-etablissement') && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}

      {show('filter-matiere') && (
        <MatiereFilter filters={filters} onSetSubject={onSetSubject} enabled={true} />
      )}
    </div>
  );
};
