import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { ACTIVITY_STATUS_CONFIG } from './activity-configs';
import type { ActivityFilters } from './activity-configs';
import { getActivityTypes } from '@/services/academic.service';
import type { ActivityType } from '@/types/activity.types';

interface ActivitiesFiltersContentProps {
  filters: ActivityFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onToggleActivityType: (activityTypeId: string) => void;
  onToggleFeature?: (feature: 'chat' | 'bot' | 'link' | 'cr') => void;
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
  filters: ActivityFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(ACTIVITY_STATUS_CONFIG).map(([key, config]) => {
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

const ActivityTypeFilter: React.FC<{
  filters: ActivityFilters;
  onToggleActivityType: (activityTypeId: string) => void;
  enabled: boolean;
}> = ({ filters, onToggleActivityType, enabled }) => {
  const { data: activityTypes = [], isLoading } = useQuery<ActivityType[]>({
    queryKey: ['activityTypes'],
    queryFn: async () => {
      const response = await getActivityTypes();
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="filter-group">
      <span className="filter-group-label">Type d&apos;activité</span>
      <div className="filter-options flex flex-wrap gap-2 max-w-full">
        {isLoading && <span className="text-sm text-muted-foreground">Chargement des types…</span>}
        {!isLoading &&
          activityTypes.map((at) => {
            const isActive = filters.activityTypeIds.includes(at.id);
            return (
              <Button
                key={at.id}
                variant="custom"
                size="sm"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                  isActive ? 'filter-option-primary--active' : 'filter-option-primary',
                )}
                onClick={() => onToggleActivityType(at.id)}
              >
                {at.label}
              </Button>
            );
          })}
      </div>
    </div>
  );
};

const FeaturesFilter: React.FC<{
  filters: ActivityFilters;
  onToggleFeature: (feature: 'chat' | 'bot' | 'link' | 'cr') => void;
}> = ({ filters, onToggleFeature }) => {
  const FEATURES = [
    { value: 'chat' as const, label: 'Chat', key: 'hasChat' as const },
    { value: 'bot' as const, label: 'Bot', key: 'hasBot' as const },
    { value: 'link' as const, label: 'Lien', key: 'hasLink' as const },
    { value: 'cr' as const, label: 'CR', key: 'canHaveCr' as const },
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Fonctionnalités</span>
      <div className="filter-options">
        {FEATURES.map((feature) => {
          const isActive = filters[feature.key] === true;
          return (
            <Button
              key={feature.value}
              variant="custom"
              size="sm"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-option-secondary--active' : 'filter-option-secondary',
              )}
              onClick={() => onToggleFeature(feature.value)}
            >
              {feature.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const SearchFilter: React.FC<{
  filters: ActivityFilters;
  onSetSearchQuery: (query: string) => void;
}> = ({ filters, onSetSearchQuery }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche</span>
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-1-nuance-3)]" />
      <Input
        type="search"
        placeholder="Nom de l'activité..."
        className="text-sm py-1.5 pl-9 pr-3 rounded-lg w-full"
        value={filters.searchQuery ?? ''}
        onChange={(e) => onSetSearchQuery(e.target.value)}
      />
    </div>
  </div>
);

export const ActivitiesFiltersContent: React.FC<ActivitiesFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onToggleActivityType,
  onToggleFeature,
  onSetSearchQuery,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}
      {show('filter-type-activity') && (
        <ActivityTypeFilter
          filters={filters}
          onToggleActivityType={onToggleActivityType}
          enabled={true}
        />
      )}
      {show('filter-features') && onToggleFeature && (
        <FeaturesFilter filters={filters} onToggleFeature={onToggleFeature} />
      )}
      {show('filter-search') && onSetSearchQuery && (
        <SearchFilter filters={filters} onSetSearchQuery={onSetSearchQuery} />
      )}
    </div>
  );
};
