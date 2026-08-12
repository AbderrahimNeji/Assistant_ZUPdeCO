import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { HOLIDAY_TYPE_CONFIG } from './holiday-configs';
import type { HolidayFilters } from './holiday-configs';

interface HolidayFiltersContentProps {
  filters: HolidayFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleType: (type: string) => void;
  onSetDateRange: (range: HolidayFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

// ─── Sub-component for type filter ─────────────────────────────────────────────

const TypeFilter: React.FC<{
  filters: HolidayFilters;
  onToggleType: (type: string) => void;
}> = ({ filters, onToggleType }) => (
  <div className="filter-group">
    <span className="filter-group-label">Type</span>
    <div className="filter-options">
      {Object.entries(HOLIDAY_TYPE_CONFIG).map(([key, config]) => {
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
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
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

const PeriodeFilter: React.FC<{
  filters: HolidayFilters;
  onSetDateRange: (range: HolidayFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetDateRange, onSetCustomDateRange }) => {
  const PERIOD_OPTIONS = [
    { value: 'all' as const, label: 'Tout' },
    { value: 'week' as const, label: 'Cette semaine' },
    { value: 'month' as const, label: 'Ce mois' },
    { value: 'year' as const, label: 'Cette année' },
  ];

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
  filters: HolidayFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetCustomDateRange }) => {
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
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(filters.customDateFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    onSetCustomDateRange(filters.customDateFrom, d);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date personnalisée</span>
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

// ─── Main component ────────────────────────────────────────────────────────────

export const HolidayFiltersContent: React.FC<HolidayFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleType,
  onSetDateRange,
  onSetCustomDateRange,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-type') && <TypeFilter filters={filters} onToggleType={onToggleType} />}

      {show('filter-periode') && (
        <PeriodeFilter
          filters={filters}
          onSetDateRange={onSetDateRange}
          onSetCustomDateRange={onSetCustomDateRange}
        />
      )}

      {show('filter-date-range') && (
        <DateRangeFilter filters={filters} onSetCustomDateRange={onSetCustomDateRange} />
      )}
    </div>
  );
};
