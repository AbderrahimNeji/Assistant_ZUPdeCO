import * as React from 'react';
import { GraduationCap, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { PROGRAM_STATUS_CONFIG } from './program-configs';
import type { ProgramFilters } from './program-configs';

interface ProgramFiltersContentProps {
  filters: ProgramFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onToggleCycle: (cycle: string) => void;
  onTogglePeriode: (periode: string) => void;
  onToggleActive?: () => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const StatutFilter: React.FC<{
  filters: ProgramFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(PROGRAM_STATUS_CONFIG).map(([key, config]) => {
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

const CycleFilter: React.FC<{
  filters: ProgramFilters;
  onToggleCycle: (cycle: string) => void;
}> = ({ filters, onToggleCycle }) => {
  const CYCLES = [
    { value: 'primary', label: 'Primaire' },
    { value: 'middle', label: 'Collège' },
    { value: 'high', label: 'Lycée' },
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Cycle</span>
      <div className="filter-options">
        {CYCLES.map((cycle) => {
          const isActive = filters.cycles.includes(cycle.value);
          return (
            <Button
              key={cycle.value}
              variant="custom"
              size="sm"
              icon={GraduationCap}
              iconPosition="left"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-option-secondary--active' : 'filter-option-secondary',
              )}
              onClick={() => onToggleCycle(cycle.value)}
            >
              {cycle.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const PeriodeFilter: React.FC<{
  filters: ProgramFilters;
  onTogglePeriode: (periode: string) => void;
}> = ({ filters, onTogglePeriode }) => {
  const PERIODES = [
    { value: 'year', label: 'Année' },
    { value: 'semester', label: 'Semestre' },
    { value: 'trimester', label: 'Trimestre' },
    { value: 'quarter', label: 'Quadrimestre' },
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Période</span>
      <div className="filter-options">
        {PERIODES.map((periode) => {
          const isActive = filters.periodes.includes(periode.value);
          return (
            <Button
              key={periode.value}
              variant="custom"
              size="sm"
              icon={CalendarDays}
              iconPosition="left"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-option-tertiary--active' : 'filter-option-tertiary',
              )}
              onClick={() => onTogglePeriode(periode.value)}
            >
              {periode.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const ProgramFiltersContent: React.FC<ProgramFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onToggleCycle,
  onTogglePeriode,
  onToggleActive,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-cycle') && <CycleFilter filters={filters} onToggleCycle={onToggleCycle} />}
      {show('filter-periode') && (
        <PeriodeFilter filters={filters} onTogglePeriode={onTogglePeriode} />
      )}
    </div>
  );
};
