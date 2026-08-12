import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { cn } from '@/lib/utils';
import type { AssignedFilter } from './AssignedPostItsBoard';

const FREQUENCY_OPTIONS: { value: AssignedFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'annually', label: 'Annuel' },
  { value: 'specific_date', label: 'Date spécifique' },
];

const QUARTERLY_PERIODS: { value: number; label: string }[] = [
  { value: 1, label: '1er trimestre' },
  { value: 2, label: '2ème trimestre' },
  { value: 3, label: '3ème trimestre' },
  { value: 4, label: '4ème trimestre' },
];

interface AssignedPostItsFiltersProps {
  filter: AssignedFilter;
  onFilterChange: (f: AssignedFilter) => void;
  specificDateFrom: string;
  specificDateTo: string;
  onSpecificDateFromChange: (date: string) => void;
  onSpecificDateToChange: (date: string) => void;
  quarterlyPeriods?: number[];
  onQuarterlyPeriodsChange?: (p: number[]) => void;
}

export const AssignedPostItsFilters: React.FC<AssignedPostItsFiltersProps> = ({
  filter,
  onFilterChange,
  specificDateFrom,
  specificDateTo,
  onSpecificDateFromChange,
  onSpecificDateToChange,
  quarterlyPeriods = [],
  onQuarterlyPeriodsChange,
}) => {
  const togglePeriod = (value: number) => {
    if (!onQuarterlyPeriodsChange) return;
    if (quarterlyPeriods.includes(value)) {
      onQuarterlyPeriodsChange(quarterlyPeriods.filter((p) => p !== value));
    } else {
      onQuarterlyPeriodsChange([...quarterlyPeriods, value]);
    }
  };

  return (
    <div className="filter-groups-container mb-5">
      {/* Récurrence */}
      <div className="filter-group">
        <span className="filter-group-label">Récurrence</span>
        <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
          {FREQUENCY_OPTIONS.map((option, index) => {
            const isActive = filter === option.value;
            const isLast = index === FREQUENCY_OPTIONS.length - 1;
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
                onClick={() => onFilterChange(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Période — multi-sélection, visible uniquement si filtre = quarterly */}
      {filter === 'quarterly' && (
        <div className="filter-group">
          <span className="filter-group-label">Période(s)</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
            {QUARTERLY_PERIODS.map((p, index) => {
              const isActive = quarterlyPeriods.includes(p.value);
              const isLast = index === QUARTERLY_PERIODS.length - 1;
              return (
                <Button
                  key={p.value}
                  variant="custom"
                  size="sm"
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-all border-0',
                    !isLast && 'border-r border-[var(--color-2-nuance-1)]',
                    isActive ? 'session-period-btn--active' : 'session-period-btn',
                  )}
                  onClick={() => togglePeriod(p.value)}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date personnalisée — visible uniquement si filtre = specific_date */}
      {filter === 'specific_date' && (
        <div className="filter-group">
          <span className="filter-group-label">Date personnalisée</span>
          <div className="w-auto mt-0.5">
            <DateRangeInput
              startDate={specificDateFrom || undefined}
              endDate={specificDateTo || undefined}
              onStartDateChange={onSpecificDateFromChange}
              onEndDateChange={onSpecificDateToChange}
              layout="horizontal"
              showConnector={true}
              showPresets={false}
              hidePickerLabels={true}
              compact={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
