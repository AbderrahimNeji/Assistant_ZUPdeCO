import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { ACTIVITY_TYPE_STATUS_CONFIG } from './activity-type-configs';
import type { ActivityTypeFilters } from './activity-type-configs';

interface ActivityTypeFiltersContentProps {
  filters: ActivityTypeFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onSetSearchQuery?: (query: string) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const StatutFilter: React.FC<{
  filters: ActivityTypeFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(ACTIVITY_TYPE_STATUS_CONFIG).map(([key, config]) => {
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

const SearchFilter: React.FC<{
  filters: ActivityTypeFilters;
  onSetSearchQuery: (query: string) => void;
}> = ({ filters, onSetSearchQuery }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche</span>
    <Input
      type="search"
      placeholder="Code ou libellé…"
      className="text-sm py-1.5 px-3 rounded-lg w-64"
      value={filters.searchQuery ?? ''}
      onChange={(e) => onSetSearchQuery(e.target.value)}
    />
  </div>
);

export const ActivityTypeFiltersContent: React.FC<ActivityTypeFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onSetSearchQuery,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-search') && onSetSearchQuery && (
        <SearchFilter filters={filters} onSetSearchQuery={onSetSearchQuery} />
      )}
    </div>
  );
};
