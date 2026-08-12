import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { VSC_REPORT_STATUS_CONFIG, VSC_REPORT_STATUS_FILTER_KEYS } from './vsc-report-configs';
import type { VscReportFilters } from '@/types/vsc-report.types';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';

interface VscReportFiltersContentProps {
  filters: VscReportFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onSetDateRange: (range: VscReportFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetCategory: (category: VscReportFilters['category']) => void;
  onSetEstablishment?: (id: string | undefined) => void;
  onSetSearch?: (value: string | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
] as const;

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'daily', label: 'Journalier' },
  { value: 'weekly', label: 'Hebdomadaire' },
] as const;

const PeriodeFilter: React.FC<{
  filters: VscReportFilters;
  onSetDateRange: (range: VscReportFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetDateRange, onSetCustomDateRange }) => {
  return (
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
};

const DateRangeFilter: React.FC<{
  filters: VscReportFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetDateRange: (range: VscReportFilters['dateRange']) => void;
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

const CategoryFilter: React.FC<{
  filters: VscReportFilters;
  onSetCategory: (category: VscReportFilters['category']) => void;
}> = ({ filters, onSetCategory }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Catégorie</span>
      <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
        {CATEGORY_OPTIONS.map((option, index) => {
          const isActive = filters.category === option.value;
          const isLast = index === CATEGORY_OPTIONS.length - 1;
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
              onClick={() => onSetCategory(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const StatutFilter: React.FC<{
  filters: VscReportFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Statut</span>
      <div className="filter-options">
        {VSC_REPORT_STATUS_FILTER_KEYS.map((key) => {
          const config = VSC_REPORT_STATUS_CONFIG[key];
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
};

const EtablissementFilter: React.FC<{
  filters: VscReportFilters;
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

// ─── Search filter ─────────────────────────────────────────────────────────────

const SearchFilter: React.FC<{
  filters: VscReportFilters;
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
          placeholder="Nom, prénom du VSC..."
          className="w-full h-9 pl-10 pr-3 rounded-lg border border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-[rgb(var(--card-rgb)/0.3)] text-sm focus:outline-none focus:border-[var(--color-2-nuance-1)]"
        />
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const VscReportFiltersContent: React.FC<VscReportFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onSetDateRange,
  onSetCustomDateRange,
  onSetCategory,
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
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-date-range') && (
        <DateRangeFilter
          filters={filters}
          onSetCustomDateRange={onSetCustomDateRange}
          onSetDateRange={onSetDateRange}
        />
      )}
      {show('filter-category') && (
        <CategoryFilter filters={filters} onSetCategory={onSetCategory} />
      )}
      {show('filter-etablissement') && onSetEstablishment && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}
    </div>
  );
};
