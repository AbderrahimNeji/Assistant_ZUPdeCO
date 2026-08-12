import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { SESSION_STATUS_CONFIG } from '@/components/sessions/session-configs';
import type {
  DashboardStatsDateFilterState,
  DashboardStatsPeriod,
  ComparisonPeriod,
} from '@/lib/dashboard-stats-date-range';

const PERIOD_OPTIONS: { value: DashboardStatsPeriod; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
];

const COMPARISON_OPTIONS: { value: ComparisonPeriod; label: string }[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'previous_week', label: 'Sem. préc.' },
  { value: 'previous_month', label: 'Mois préc.' },
  { value: 'previous_quarter', label: 'Trim. préc.' },
  { value: 'previous_year', label: 'Année préc.' },
];

export interface DashboardStatsFiltersProps {
  filters: DashboardStatsDateFilterState;
  onChange: (next: DashboardStatsDateFilterState) => void;
  disabled?: boolean;
  showEstablishmentFilter?: boolean;
  showStatusFilter?: boolean;
  showComparisonFilter?: boolean;
  sessionStatuses?: string[];
  onToggleStatus?: (status: string) => void;
}

export const DashboardStatsFilters: React.FC<DashboardStatsFiltersProps> = ({
  filters,
  onChange,
  disabled,
  showEstablishmentFilter = false,
  showStatusFilter = false,
  showComparisonFilter = true,
  sessionStatuses = [],
  onToggleStatus,
}) => {
  const usingCustomRange = Boolean(filters.customDateFrom || filters.customDateTo);
  const { options, isLoading, onSearch } = useEstablishmentsAutocomplete();

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
      onChange({
        ...filters,
        customDateFrom: undefined,
      });
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onChange({
      ...filters,
      dateRange: 'all',
      customDateFrom: d,
      comparisonPeriod: 'none',
    });
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onChange({
        ...filters,
        customDateTo: undefined,
      });
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59);
    onChange({
      ...filters,
      dateRange: 'all',
      customDateTo: d,
      comparisonPeriod: 'none',
    });
  };

  return (
    <div className={cn('filter-groups-container', disabled && 'pointer-events-none opacity-60')}>
      <div className="filter-group">
        <span className="filter-group-label">Période</span>
        <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
          {PERIOD_OPTIONS.map((option, index) => {
            const isActive = filters.dateRange === option.value && !usingCustomRange;
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
                  onChange({
                    dateRange: option.value,
                    customDateFrom: undefined,
                    customDateTo: undefined,
                    comparisonPeriod: 'none',
                  });
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

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

      {showComparisonFilter && (
        <div className="filter-group">
          <span className="filter-group-label">Comparaison</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
            {COMPARISON_OPTIONS.map((option, index) => {
              const isActive = filters.comparisonPeriod === option.value;
              const isLast = index === COMPARISON_OPTIONS.length - 1;
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
                    onChange({
                      dateRange: 'all',
                      customDateFrom: undefined,
                      customDateTo: undefined,
                      comparisonPeriod: option.value,
                    });
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {showStatusFilter && onToggleStatus && (
        <div className="filter-group">
          <span className="filter-group-label">Statut</span>
          <div className="filter-options">
            {Object.entries(SESSION_STATUS_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = sessionStatuses.includes(key);
              return (
                <Button
                  key={key}
                  variant="custom"
                  size="sm"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all border',
                    isActive ? 'filter-badge-active' : 'filter-badge-inactive',
                  )}
                  style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
                  onClick={() => onToggleStatus(key)}
                >
                  {config.isInProgress ? (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: isActive ? 'white' : config.badgeColor }}
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
      )}

      {showEstablishmentFilter && (
        <div className="filter-group">
          <span className="filter-group-label">Établissement</span>
          <div className="w-64">
            <Autocomplete
              placeholder="Rechercher un établissement..."
              options={options}
              value={filters.establishmentIds?.[0] ?? ''}
              onChange={(val) => {
                onChange({
                  ...filters,
                  establishmentIds: val ? [val] : undefined,
                });
              }}
              onSearch={onSearch}
              isLoading={isLoading}
              minSearchLength={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};
