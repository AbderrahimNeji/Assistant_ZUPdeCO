import * as React from 'react';
import { CheckCircle2, Clock, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { SCHOOL_YEAR_STATUS_CONFIG } from './school-year-configs';
import type { SchoolYearFilters } from './school-year-configs';

interface SchoolYearFiltersContentProps {
  filters: SchoolYearFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onToggleCurrentFilter: () => void;
  onTogglePeriodPhase: (phase: 'ended' | 'upcoming') => void;
  onSetSearchQuery?: (query: string) => void;
  onSetDateRange: (
    startFrom: Date | undefined,
    startTo: Date | undefined,
    endFrom: Date | undefined,
    endTo: Date | undefined,
  ) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const StatutFilter: React.FC<{
  filters: SchoolYearFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(SCHOOL_YEAR_STATUS_CONFIG).map(([key, config]) => {
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

const TypeFilter: React.FC<{
  filters: SchoolYearFilters;
  onToggleCurrentFilter: () => void;
  onTogglePeriodPhase: (phase: 'ended' | 'upcoming') => void;
}> = ({ filters, onToggleCurrentFilter, onTogglePeriodPhase }) => (
  <div className="filter-group">
    <span className="filter-group-label">Type</span>
    <div className="filter-options">
      <Button
        variant="custom"
        size="sm"
        icon={CheckCircle2}
        iconPosition="left"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
          filters.isCurrent === true ? 'filter-badge-active' : 'filter-badge-inactive',
        )}
        style={{ '--filter-color': 'var(--color-2-nuance-1)' } as React.CSSProperties}
        onClick={onToggleCurrentFilter}
      >
        Année en cours
      </Button>
      <Button
        variant="custom"
        size="sm"
        icon={CheckCircle2}
        iconPosition="left"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
          filters.periodPhases.includes('ended') ? 'filter-badge-active' : 'filter-badge-inactive',
        )}
        style={{ '--filter-color': 'rgb(var(--color-error))' } as React.CSSProperties}
        onClick={() => onTogglePeriodPhase('ended')}
      >
        Terminée
      </Button>
      <Button
        variant="custom"
        size="sm"
        icon={CalendarClock}
        iconPosition="left"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
          filters.periodPhases.includes('upcoming')
            ? 'filter-badge-active'
            : 'filter-badge-inactive',
        )}
        style={{ '--filter-color': 'var(--color-2-nuance-1)' } as React.CSSProperties}
        onClick={() => onTogglePeriodPhase('upcoming')}
      >
        À venir
      </Button>
    </div>
  </div>
);

const SearchFilter: React.FC<{
  filters: SchoolYearFilters;
  onSetSearchQuery: (query: string) => void;
}> = ({ filters, onSetSearchQuery }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche</span>
    <Input
      type="search"
      placeholder="Code année scolaire…"
      className="text-sm py-1.5 px-3 rounded-lg w-64"
      value={filters.searchQuery ?? ''}
      onChange={(e) => onSetSearchQuery(e.target.value)}
    />
  </div>
);

const DateRangeFilter: React.FC<{
  filters: SchoolYearFilters;
  onSetDateRange: (
    startFrom: Date | undefined,
    startTo: Date | undefined,
    endFrom: Date | undefined,
    endTo: Date | undefined,
  ) => void;
}> = ({ filters, onSetDateRange }) => {
  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startFromStr = toDateString(filters.startDateFrom);
  const startToStr = toDateString(filters.startDateTo);

  const handleStartFromChange = (val: string) => {
    if (!val) {
      onSetDateRange(undefined, filters.startDateTo, filters.endDateFrom, filters.endDateTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onSetDateRange(d, filters.startDateTo, filters.endDateFrom, filters.endDateTo);
  };

  const handleStartToChange = (val: string) => {
    if (!val) {
      onSetDateRange(filters.startDateFrom, undefined, filters.endDateFrom, filters.endDateTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    onSetDateRange(filters.startDateFrom, d, filters.endDateFrom, filters.endDateTo);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Période</span>
      <div className="w-auto">
        <DateRangeInput
          startDate={startFromStr}
          endDate={startToStr}
          onStartDateChange={handleStartFromChange}
          onEndDateChange={handleStartToChange}
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

export const SchoolYearFiltersContent: React.FC<SchoolYearFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onToggleCurrentFilter,
  onTogglePeriodPhase,
  onSetSearchQuery,
  onSetDateRange,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-current') && (
        <TypeFilter
          filters={filters}
          onToggleCurrentFilter={onToggleCurrentFilter}
          onTogglePeriodPhase={onTogglePeriodPhase}
        />
      )}
      {show('filter-search') && onSetSearchQuery && (
        <SearchFilter filters={filters} onSetSearchQuery={onSetSearchQuery} />
      )}
      {show('filter-date-range') && (
        <DateRangeFilter filters={filters} onSetDateRange={onSetDateRange} />
      )}
    </div>
  );
};
