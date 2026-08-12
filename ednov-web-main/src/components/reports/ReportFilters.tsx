import * as React from 'react';
import { Star, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import {
  REPORT_STATUS_CONFIG,
  SESSION_TYPE_CONFIG,
  SESSION_TYPE_FILTER_KEYS,
} from './report-configs';
import type { ReportFilters } from '@/types/report.types';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';

interface ReportFiltersContentProps {
  filters: ReportFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onToggleRating: (rating: number) => void;
  onSetDateRange: (range: ReportFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onToggleSessionType: (type: string) => void;
  onSetEstablishment: (id: string | undefined) => void;
  onSetSearch?: (value: string | undefined) => void;
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
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
  filters: ReportFilters;
  onSetDateRange: (range: ReportFilters['dateRange']) => void;
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
  filters: ReportFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetDateRange: (range: ReportFilters['dateRange']) => void;
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
    onSetCustomDateRange(new Date(year, month - 1, day, 0, 0, 0), filters.customDateTo);
    onSetDateRange('all');
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(filters.customDateFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    onSetCustomDateRange(filters.customDateFrom, new Date(year, month - 1, day, 23, 59, 59));
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

const StatutFilter: React.FC<{
  filters: ReportFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {/* Hide "Brouillon" (draft) in the dashboard filter bar; draft still appears on rows/cards via REPORT_STATUS_CONFIG */}
      {Object.entries(REPORT_STATUS_CONFIG)
        .filter(([key]) => key !== 'draft')
        .map(([key, config]) => {
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
              style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
              onClick={() => onToggleStatus(key)}
            >
              {config.label}
            </Button>
          );
        })}
    </div>
  </div>
);

const NoteFilter: React.FC<{
  filters: ReportFilters;
  onToggleRating: (rating: number) => void;
}> = ({ filters, onToggleRating }) => (
  <div className="filter-group">
    <span className="filter-group-label">Note</span>
    <div className="filter-options">
      {[1, 2, 3, 4, 5].map((rating) => {
        const isActive = filters.ratings.includes(rating);
        return (
          <Button
            key={rating}
            variant="custom"
            size="sm"
            icon={Star}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isActive ? 'filter-option-tertiary--active' : 'filter-option-tertiary',
            )}
            onClick={() => onToggleRating(rating)}
          >
            {rating}
          </Button>
        );
      })}
    </div>
  </div>
);

const TypeSessionFilter: React.FC<{
  filters: ReportFilters;
  onToggleSessionType: (type: string) => void;
}> = ({ filters, onToggleSessionType }) => (
  <div className="filter-group">
    <span className="filter-group-label">Type de séance</span>
    <div className="filter-options">
      {SESSION_TYPE_FILTER_KEYS.map((key) => {
        const config = SESSION_TYPE_CONFIG[key];
        const Icon = config.icon;
        const isActive = filters.sessionTypes?.includes(key) ?? false;
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
            style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
            onClick={() => onToggleSessionType(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const EtablissementFilter: React.FC<{
  filters: ReportFilters;
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
          value={filters.establishmentIds?.[0] ?? ''}
          onChange={(val) => onSetEstablishment(val || undefined)}
          onSearch={onSearch}
          isLoading={isLoading}
          minSearchLength={2}
        />
      </div>
    </div>
  );
};

// ─── Search filter ─────────────────────────────────────────────────────────────

const SearchFilter: React.FC<{
  filters: ReportFilters;
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

// ─── Main component ────────────────────────────────────────────────────────────

export const ReportFiltersContent: React.FC<ReportFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onToggleRating,
  onSetDateRange,
  onSetCustomDateRange,
  onToggleSessionType,
  onSetEstablishment,
  onSetSearch,
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

      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}

      {show('filter-note') && <NoteFilter filters={filters} onToggleRating={onToggleRating} />}

      {show('filter-type-session') && (
        <TypeSessionFilter filters={filters} onToggleSessionType={onToggleSessionType} />
      )}

      {show('filter-etablissement') && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}
    </div>
  );
};
