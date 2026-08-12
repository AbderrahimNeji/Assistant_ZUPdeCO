import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { LEVEL_CYCLE_CONFIG, LEVEL_STATUS_CONFIG } from './level-configs';
import type { LevelFilters } from './level-configs';

interface LevelFiltersContentProps {
  filters: LevelFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleCycle: (cycle: string) => void;
  onToggleStatus: (status: string) => void;
  onSetSearchTerm: (term: string) => void;
  onSetAgeRange: (min: number | undefined, max: number | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

// ─── Sub-components for each filter group ──────────────────────────────────────

const CycleFilter: React.FC<{
  filters: LevelFilters;
  onToggleCycle: (cycle: string) => void;
}> = ({ filters, onToggleCycle }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Cycle</span>
      <div className="filter-options">
        {Object.entries(LEVEL_CYCLE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = filters.cycles.includes(key);
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
              style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
              onClick={() => onToggleCycle(key)}
            >
              {config.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const StatutFilter: React.FC<{
  filters: LevelFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Statut</span>
      <div className="filter-options">
        {Object.entries(LEVEL_STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = filters.statuses.includes(key);
          // Pour les variants sémantiques (active, disabled), pas de badgeColor défini
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
};

const SearchFilter: React.FC<{
  filters: LevelFilters;
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

const AgeRangeFilter: React.FC<{
  filters: LevelFilters;
  onSetAgeRange: (min: number | undefined, max: number | undefined) => void;
}> = ({ filters, onSetAgeRange }) => (
  <div className="filter-group">
    <span className="filter-group-label">Tranche d'âge</span>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder="Min"
        className="text-sm py-1.5 px-3 rounded-lg w-20"
        value={filters.minAge ?? ''}
        onChange={(e) => {
          const val = e.target.value ? Number.parseInt(e.target.value) : undefined;
          onSetAgeRange(val, filters.maxAge);
        }}
        min={0}
        max={99}
      />
      <span className="text-sm text-muted-foreground">-</span>
      <Input
        type="number"
        placeholder="Max"
        className="text-sm py-1.5 px-3 rounded-lg w-20"
        value={filters.maxAge ?? ''}
        onChange={(e) => {
          const val = e.target.value ? Number.parseInt(e.target.value) : undefined;
          onSetAgeRange(filters.minAge, val);
        }}
        min={0}
        max={99}
      />
      <span className="text-sm text-muted-foreground">ans</span>
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

export const LevelFiltersContent: React.FC<LevelFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleCycle,
  onToggleStatus,
  onSetSearchTerm,
  onSetAgeRange,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-cycle') && <CycleFilter filters={filters} onToggleCycle={onToggleCycle} />}

      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}

      {show('filter-search') && (
        <SearchFilter filters={filters} onSetSearchTerm={onSetSearchTerm} />
      )}

      {show('filter-age-range') && (
        <AgeRangeFilter filters={filters} onSetAgeRange={onSetAgeRange} />
      )}
    </div>
  );
};
