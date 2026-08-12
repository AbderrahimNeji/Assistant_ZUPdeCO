import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { RotateCcw } from 'lucide-react';

interface PersonalPostItsFiltersProps {
  deadlineFrom: string;
  deadlineTo: string;
  onDeadlineFromChange: (date: string) => void;
  onDeadlineToChange: (date: string) => void;
  onReset: () => void;
  resultCount: number;
}

export const PersonalPostItsFilters: React.FC<PersonalPostItsFiltersProps> = ({
  deadlineFrom,
  deadlineTo,
  onDeadlineFromChange,
  onDeadlineToChange,
  onReset,
  resultCount,
}) => {
  const hasActiveFilters = !!deadlineFrom || !!deadlineTo;

  return (
    <div className="filters-panel animate-fade-in mb-5">
      <div className="filter-panel-header">
        <div className="filter-groups-container">
          <div className="filter-group">
            <span className="filter-group-label">Deadline</span>
            <div className="w-auto mt-0.5">
              <DateRangeInput
                startDate={deadlineFrom || undefined}
                endDate={deadlineTo || undefined}
                onStartDateChange={onDeadlineFromChange}
                onEndDateChange={onDeadlineToChange}
                layout="horizontal"
                showConnector={true}
                showPresets={false}
                hidePickerLabels={true}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="filter-actions">
        <div className="filter-result-count">
          {resultCount} post-it{resultCount !== 1 ? 's' : ''} trouvé{resultCount !== 1 ? 's' : ''}
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RotateCcw}
          iconPosition="left"
          onClick={onReset}
          disabled={!hasActiveFilters}
        >
          Réinitialiser
        </Button>
      </div>
    </div>
  );
};
