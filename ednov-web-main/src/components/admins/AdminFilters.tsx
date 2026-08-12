import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { ADMIN_STATUS_CONFIG } from './admin-configs';
import type { AdminFilters } from './admin-configs';

interface AdminFiltersContentProps {
  filters: AdminFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onSetEstablishment: (id: string | undefined) => void;
  onSetDateRange: (range: AdminFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const StatusFilter: React.FC<{
  filters: AdminFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(ADMIN_STATUS_CONFIG).map(([key, config]) => {
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

const EtablissementFilter: React.FC<{
  filters: AdminFilters;
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

const DateCreationFilter: React.FC<{
  filters: AdminFilters;
  onSetDateRange: (range: AdminFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetDateRange, onSetCustomDateRange }) => {
  const PERIOD_OPTIONS = [
    { value: 'all' as const, label: 'Tout' },
    { value: 'week' as const, label: 'Cette semaine' },
    { value: 'month' as const, label: 'Ce mois' },
    { value: 'year' as const, label: 'Cette année' },
  ];

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
      <span className="filter-group-label">Date de création</span>
      <div className="flex items-center gap-2">
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
        {filters.dateRange === 'all' && (
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
        )}
      </div>
    </div>
  );
};

export const AdminFiltersContent: React.FC<AdminFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onSetEstablishment,
  onSetDateRange,
  onSetCustomDateRange,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatusFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-etablissement') && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}
      {show('filter-dates') && (
        <DateCreationFilter
          filters={filters}
          onSetDateRange={onSetDateRange}
          onSetCustomDateRange={onSetCustomDateRange}
        />
      )}
    </div>
  );
};
