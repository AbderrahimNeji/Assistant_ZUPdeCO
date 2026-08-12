import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { ROLE_MODE_CONFIG, ROLE_STATUS_CONFIG } from './role-configs';
import type { RoleFilters } from './role-configs';

interface RoleFiltersContentProps {
  filters: RoleFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  roleGroups: Array<{ code: string; label: string; icon: string | null; color: string | null }>;
  onToggleRoleGroup: (groupCode: string) => void;
  onToggleStatus: (status: string) => void;
  onToggleMode: (mode: string) => void;
  onSetSearchTerm: (term: string) => void;
  onSetHierarchyRange: (min: number | undefined, max: number | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

// ─── Sub-components for each filter group ──────────────────────────────────────

const RoleGroupFilter: React.FC<{
  filters: RoleFilters;
  roleGroups: Array<{ code: string; label: string; icon: string | null; color: string | null }>;
  onToggleRoleGroup: (groupCode: string) => void;
}> = ({ filters, roleGroups, onToggleRoleGroup }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Familles de rôles</span>
      <div className="filter-options">
        {roleGroups.map((group) => {
          const isActive = filters.roleGroups.includes(group.code);
          return (
            <Button
              key={group.code}
              variant="custom"
              size="sm"
              icon={group.icon ? undefined : undefined}
              iconPosition="left"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                isActive ? 'filter-badge-active' : 'filter-badge-inactive',
              )}
              style={
                {
                  '--filter-color': group.color || 'var(--color-1-nuance-1)',
                } as React.CSSProperties
              }
              onClick={() => onToggleRoleGroup(group.code)}
            >
              {group.icon && <DynamicIcon name={group.icon} className="h-4 w-4" />}
              {group.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const StatutFilter: React.FC<{
  filters: RoleFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Statut</span>
      <div className="filter-options">
        {Object.entries(ROLE_STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = filters.statuses.includes(key as any);
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

const ModeFilter: React.FC<{
  filters: RoleFilters;
  onToggleMode: (mode: string) => void;
}> = ({ filters, onToggleMode }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Modes opérationnels</span>
      <div className="filter-options">
        {Object.entries(ROLE_MODE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = filters.modes.includes(key as any);
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
              onClick={() => onToggleMode(key)}
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
  filters: RoleFilters;
  onSetSearchTerm: (term: string) => void;
}> = ({ filters, onSetSearchTerm }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Recherche</span>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Rechercher un rôle..."
          className="text-sm py-1.5 pl-9 pr-3 rounded-lg"
          value={filters.searchTerm ?? ''}
          onChange={(e) => onSetSearchTerm(e.target.value || undefined)}
        />
      </div>
    </div>
  );
};

const HierarchyRangeFilter: React.FC<{
  filters: RoleFilters;
  onSetHierarchyRange: (min: number | undefined, max: number | undefined) => void;
}> = ({ filters, onSetHierarchyRange }) => {
  return (
    <div className="filter-group">
      <span className="filter-group-label">Niveaux hiérarchiques</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min"
          className="text-sm py-1.5 px-3 rounded-lg w-20"
          value={filters.minHierarchyLevel ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number.parseInt(e.target.value) : undefined;
            onSetHierarchyRange(val, filters.maxHierarchyLevel);
          }}
          min={1}
          max={10}
        />
        <span className="text-sm text-muted-foreground">à</span>
        <Input
          type="number"
          placeholder="Max"
          className="text-sm py-1.5 px-3 rounded-lg w-20"
          value={filters.maxHierarchyLevel ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number.parseInt(e.target.value) : undefined;
            onSetHierarchyRange(filters.minHierarchyLevel, val);
          }}
          min={1}
          max={10}
        />
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const RoleFiltersContent: React.FC<RoleFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  roleGroups,
  onToggleRoleGroup,
  onToggleStatus,
  onToggleMode,
  onSetSearchTerm,
  onSetHierarchyRange,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-role-groups') && (
        <RoleGroupFilter
          filters={filters}
          roleGroups={roleGroups}
          onToggleRoleGroup={onToggleRoleGroup}
        />
      )}
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-modes') && <ModeFilter filters={filters} onToggleMode={onToggleMode} />}
      {show('filter-hierarchy') && (
        <HierarchyRangeFilter filters={filters} onSetHierarchyRange={onSetHierarchyRange} />
      )}
      {show('filter-search') && (
        <SearchFilter filters={filters} onSetSearchTerm={onSetSearchTerm} />
      )}
    </div>
  );
};
