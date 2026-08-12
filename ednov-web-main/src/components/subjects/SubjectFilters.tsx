import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { SUBJECT_CYCLE_CONFIG, SUBJECT_STATUS_CONFIG } from './subject-configs';
import type { SubjectFilters } from './subject-configs';

interface SubjectFiltersContentProps {
  filters: SubjectFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleCycle: (cycle: string) => void;
  onToggleStatus: (status: string) => void;
  onToggleCore: () => void;
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
  filters: SubjectFilters;
  onToggleCycle: (cycle: string) => void;
}> = ({ filters, onToggleCycle }) => (
  <div className="filter-group">
    <span className="filter-group-label">Cycle éducatif</span>
    <div className="filter-options">
      {Object.entries(SUBJECT_CYCLE_CONFIG).map(([key, config]) => {
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
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
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

const StatusFilter: React.FC<{
  filters: SubjectFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(SUBJECT_STATUS_CONFIG).map(([key, config]) => {
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

const CoreFilter: React.FC<{
  filters: SubjectFilters;
  onToggleCore: () => void;
}> = ({ filters, onToggleCore }) => {
  let label = 'Toutes';
  let isActive = false;

  if (filters.isCore === true) {
    label = 'Matières principales';
    isActive = true;
  } else if (filters.isCore === false) {
    label = 'Matières secondaires';
    isActive = true;
  }

  return (
    <div className="filter-group">
      <span className="filter-group-label">Type</span>
      <div className="filter-options">
        <Button
          variant="custom"
          size="sm"
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
            isActive ? 'filter-option-primary--active' : 'filter-option-primary',
          )}
          onClick={onToggleCore}
        >
          {label}
        </Button>
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const SubjectFiltersContent: React.FC<SubjectFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleCycle,
  onToggleStatus,
  onToggleCore,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('cycles') && <CycleFilter filters={filters} onToggleCycle={onToggleCycle} />}

      {show('statuses') && <StatusFilter filters={filters} onToggleStatus={onToggleStatus} />}

      {show('core') && <CoreFilter filters={filters} onToggleCore={onToggleCore} />}
    </div>
  );
};
