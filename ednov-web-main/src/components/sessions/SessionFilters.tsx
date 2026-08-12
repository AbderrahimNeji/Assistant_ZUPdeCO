import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Select } from '@/components/forms/Select';
import { Search } from 'lucide-react';
import {
  SESSION_TYPE_CONFIG,
  SESSION_TYPE_FILTER_KEYS,
  SESSION_STATUS_CONFIG,
} from './session-configs';
import type { SessionFilters } from './session-configs';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { getLevels, getSubjects } from '@/services/academic.service';
import type { Level } from '@/types/level.types';
import type { Subject } from '@/types/subject.types';

interface SessionFiltersContentProps {
  filters: SessionFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleType: (type: string) => void;
  onToggleStatus: (status: string) => void;
  onSetDateRange: (range: SessionFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetEstablishment: (id: string | undefined) => void;
  onSetSubject: (id: string | undefined) => void;
  onSetLevel: (id: string | undefined) => void;
  onSetSearch?: (value: string | undefined) => void;
  onSetRecurrenceType?: (type: string | undefined) => void;
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

const PeriodeFilter: React.FC<{
  filters: SessionFilters;
  onSetDateRange: (range: SessionFilters['dateRange']) => void;
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
  filters: SessionFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetDateRange: (range: SessionFilters['dateRange']) => void;
}> = ({ filters, onSetCustomDateRange, onSetDateRange }) => {
  // Convert Date to yyyy-MM-dd string in local timezone (avoid UTC conversion)
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
    // Parse as local date to avoid timezone shift
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

const TypeFilter: React.FC<{
  filters: SessionFilters;
  onToggleType: (type: string) => void;
}> = ({ filters, onToggleType }) => (
  <div className="filter-group">
    <span className="filter-group-label">Type</span>
    <div className="filter-options">
      {SESSION_TYPE_FILTER_KEYS.map((key) => {
        const config = SESSION_TYPE_CONFIG[key];
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

const StatutFilter: React.FC<{
  filters: SessionFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(SESSION_STATUS_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const isActive = filters.statuses.includes(key);

        const getBadgeClassName = () => {
          if (!isActive) return 'filter-badge-inactive';
          if (config.filterActiveVariant === 'solid') return 'filter-badge-active-solid';
          return 'filter-badge-active';
        };

        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              getBadgeClassName(),
            )}
            style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
            onClick={() => onToggleStatus(key)}
          >
            {config.isInProgress ? (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: isActive ? 'white' : 'rgb(var(--color-error))' }}
              />
            ) : (
              <Icon className="w-3.5 h-3.5" />
            )}
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const EtablissementFilter: React.FC<{
  filters: SessionFilters;
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
  filters: SessionFilters;
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

const LevelFilter: React.FC<{
  filters: SessionFilters;
  onSetLevel: (id: string | undefined) => void;
  enabled: boolean;
}> = ({ filters, onSetLevel, enabled }) => {
  const { data: levels = [], isLoading } = useQuery<Level[]>({
    queryKey: ['levels'],
    queryFn: async () => {
      const response = await getLevels();
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const selectOptions = [
    { value: '', label: 'Tous' },
    ...levels.map((l) => ({ value: l.id, label: l.label })),
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Niveau</span>
      <Select
        options={selectOptions}
        value={filters.levelId ?? ''}
        onChange={(val) => onSetLevel(val || undefined)}
        disabled={isLoading}
        size="sm"
        className="min-w-36"
      />
    </div>
  );
};

const SearchFilter: React.FC<{
  filters: SessionFilters;
  onSetSearch: (value: string | undefined) => void;
}> = ({ filters, onSetSearch }) => {
  const [localValue, setLocalValue] = React.useState(filters.search ?? '');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSetSearch(val.trim() || undefined);
    }, 300);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Recherche</span>
      <div className="relative w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder="Nom, prénom..."
          className="w-full h-9 pl-10 pr-3 rounded-lg border border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-[rgb(var(--card-rgb)/0.3)] text-sm focus:outline-none focus:border-[var(--color-2-nuance-1)]"
        />
      </div>
    </div>
  );
};

const RecurrenceFilter: React.FC<{
  filters: SessionFilters;
  onSetRecurrenceType: (type: string | undefined) => void;
}> = ({ filters, onSetRecurrenceType }) => {
  const selectOptions = [
    { value: '', label: 'Toutes' },
    { value: 'daily', label: 'Quotidienne' },
    { value: 'weekly', label: 'Hebdomadaire' },
    { value: 'several_days_per_week', label: 'Plusieurs jours/semaine' },
    { value: 'monthly', label: 'Mensuelle' },
    { value: 'ab', label: 'Bi-mensuelle (semaines A/B)' },
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Récurrence</span>
      <Select
        options={selectOptions}
        value={filters.recurrenceType ?? ''}
        onChange={(val) => onSetRecurrenceType(val || undefined)}
        size="sm"
        className="min-w-36"
      />
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const SessionFiltersContent: React.FC<SessionFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleType,
  onToggleStatus,
  onSetDateRange,
  onSetCustomDateRange,
  onSetEstablishment,
  onSetSubject,
  onSetLevel,
  onSetSearch,
  onSetRecurrenceType,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-search') && onSetSearch && (
        <SearchFilter filters={filters} onSetSearch={onSetSearch} />
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

      {show('filter-type') && <TypeFilter filters={filters} onToggleType={onToggleType} />}

      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}

      {show('filter-etablissement') && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}

      {show('filter-matiere') && (
        <MatiereFilter filters={filters} onSetSubject={onSetSubject} enabled={true} />
      )}

      {show('filter-level') && (
        <LevelFilter filters={filters} onSetLevel={onSetLevel} enabled={true} />
      )}

      {show('filter-recurrence') && onSetRecurrenceType && (
        <RecurrenceFilter filters={filters} onSetRecurrenceType={onSetRecurrenceType} />
      )}
    </div>
  );
};
