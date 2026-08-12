import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { DateRangeInput } from '@/components/forms/DateRangeInput';

export interface MatchingFilters {
  dateRange: 'all' | 'today' | 'week' | 'month';
  customDateFrom?: Date;
  customDateTo?: Date;
  specificDates?: Date[];
}

interface MatchingSessionFiltersProps {
  filters: MatchingFilters;
  onSetDateRange: (range: MatchingFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
] as const;

const PeriodeFilter: React.FC<{
  filters: MatchingFilters;
  onSetDateRange: (range: MatchingFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetDateRange, onSetCustomDateRange }) => (
  <div className="filter-group">
    <span className="filter-group-label text-xs">Période</span>
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
              'px-2.5 py-1 text-xs font-medium transition-all border-0',
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
  filters: MatchingFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetDateRange: (range: MatchingFilters['dateRange']) => void;
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
      <span className="filter-group-label text-xs">Date personnalisée</span>
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

export const MatchingSessionFiltersContent: React.FC<MatchingSessionFiltersProps> = ({
  filters,
  onSetDateRange,
  onSetCustomDateRange,
}) => {
  return (
    <div className="filter-groups-container">
      <PeriodeFilter
        filters={filters}
        onSetDateRange={onSetDateRange}
        onSetCustomDateRange={onSetCustomDateRange}
      />

      <DateRangeFilter
        filters={filters}
        onSetCustomDateRange={onSetCustomDateRange}
        onSetDateRange={onSetDateRange}
      />
    </div>
  );
};
