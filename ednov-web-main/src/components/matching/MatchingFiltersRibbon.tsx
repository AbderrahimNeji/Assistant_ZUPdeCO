import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { MatchingSessionFiltersContent } from './MatchingSessionFilters';
import type { MatchingFilters } from './MatchingSessionFilters';

interface MatchingFiltersRibbonProps {
  show: boolean;
  filters: MatchingFilters;
  hasActiveFilters: boolean;
  resultCount: number;
  onSetDateRange: (range: MatchingFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onClearFilters: () => void;
}

export const MatchingFiltersRibbon: React.FC<MatchingFiltersRibbonProps> = ({
  show,
  filters,
  hasActiveFilters,
  resultCount,
  onSetDateRange,
  onSetCustomDateRange,
  onClearFilters,
}) => {
  if (!show) return null;

  return (
    <div className="filters-panel animate-fade-in">
      <div className="filter-panel-header">
        <MatchingSessionFiltersContent
          filters={filters}
          onSetDateRange={onSetDateRange}
          onSetCustomDateRange={onSetCustomDateRange}
        />
      </div>

      <div className="filter-actions">
        <div className="filter-result-count">
          {resultCount} séance{resultCount === 1 ? '' : 's'} trouvée{resultCount === 1 ? '' : 's'}
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearFilters}
              icon={X}
              iconPosition="left"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
