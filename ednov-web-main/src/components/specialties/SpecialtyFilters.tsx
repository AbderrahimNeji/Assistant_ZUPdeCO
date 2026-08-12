import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { SPECIALTY_STATUS_CONFIG } from './specialty-configs';
import type { SpecialtyFilters } from './specialty-configs';

interface SpecialtyFiltersContentProps {
  filters: SpecialtyFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onSetSearchTerm: (term: string) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const StatutFilter: React.FC<{
  filters: SpecialtyFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(SPECIALTY_STATUS_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const isActive = filters.statuses.includes(key);
        const color = config.badgeColor || 'rgb(var(--status-success))';
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
            style={{ '--filter-color': color } as React.CSSProperties}
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
  filters: SpecialtyFilters;
  onSetSearchTerm: (term: string) => void;
}> = ({ filters, onSetSearchTerm }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche</span>
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Code ou libellé..."
        className="text-sm py-1.5 pl-9 pr-3 rounded-lg w-full"
        value={filters.searchTerm ?? ''}
        onChange={(e) => onSetSearchTerm(e.target.value)}
      />
    </div>
  </div>
);

export const SpecialtyFiltersContent: React.FC<SpecialtyFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onSetSearchTerm,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-search') && (
        <SearchFilter filters={filters} onSetSearchTerm={onSetSearchTerm} />
      )}
    </div>
  );
};
