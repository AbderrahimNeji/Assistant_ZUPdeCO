import * as React from 'react';
import { X, Save, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { cn } from '@/lib/utils';
import type { FilterGroup } from '@/types/data-table.types';

interface DataTableFiltersProps {
  show: boolean;
  hasActiveFilters: boolean;
  filterGroups: FilterGroup[];
  onClearFilters: () => void;
  onSaveAsDefault?: () => void;
  resultCount: number;
  resultLabel: string;
  isSaving?: boolean;
  /** When provided, show the configure button in the filter panel header */
  onToggleConfigure?: () => void;
  /** Whether the configure panel is currently open */
  showConfigure?: boolean;
  /** Content to render in the configure panel (filter visibility toggles) */
  configureContent?: React.ReactNode;
  /** Display mode: 'collapse' (default, inline panel) or 'modal' (in a modal dialog) */
  mode?: 'collapse' | 'modal';
  /** Callback to close the modal (only used when mode='modal') */
  onClose?: () => void;
}

export const DataTableFilters: React.FC<DataTableFiltersProps> = ({
  show,
  hasActiveFilters,
  filterGroups,
  onClearFilters,
  onSaveAsDefault,
  resultCount,
  resultLabel,
  isSaving = false,
  onToggleConfigure,
  showConfigure = false,
  configureContent,
  mode = 'collapse',
  onClose,
}) => {
  if (!show) return null;

  const filterContent = (
    <>
      {/* Header row: filter groups + configure button */}
      <div className="filter-panel-header">
        <div className="filter-groups-container">
          {filterGroups.map((group) => (
            <div key={group.id} className="filter-group">
              <span className="filter-group-label">{group.label}</span>
              {group.type === 'custom' && group.customRender ? (
                group.customRender()
              ) : (
                <div className="filter-options">{group.customRender?.()}</div>
              )}
            </div>
          ))}
        </div>

        {onToggleConfigure && (
          <Button
            preset="filter-configure"
            className={cn(showConfigure && 'section-action-button-active')}
            onClick={onToggleConfigure}
          />
        )}
      </div>

      {/* Integrated configure panel — slides down inside the bandeau */}
      {showConfigure && configureContent && (
        <div className="filter-configure-panel">
          <div className="filter-configure-separator" />
          <div className="filter-configure-content">{configureContent}</div>
        </div>
      )}

      <div className="filter-actions">
        <div className="filter-result-count">
          {resultCount} {resultLabel} trouvé{resultCount === 1 ? '' : 's'}
        </div>
        <div className="flex gap-2">
          {mode === 'modal' && onClose && (
            <Button variant="primary" size="sm" onClick={onClose} icon={X} iconPosition="left">
              Fermer
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearFilters}
            icon={RotateCcw}
            iconPosition="left"
            disabled={!hasActiveFilters}
          >
            Réinitialiser
          </Button>
          {onSaveAsDefault && mode !== 'modal' && (
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveAsDefault}
              icon={Save}
              iconPosition="left"
              loading={isSaving}
            >
              Sauvegarder par défaut
            </Button>
          )}
        </div>
      </div>
    </>
  );

  if (mode === 'modal') {
    return (
      <BaseModal
        open={show}
        onClose={onClose || (() => {})}
        size="xl"
        header={{
          title: 'Filtres',
          titleSize: 'lg',
          titleWeight: 'semibold',
        }}
        hideContentWrapper
      >
        <div className="filters-panel">{filterContent}</div>
      </BaseModal>
    );
  }

  return <div className="filters-panel animate-fade-in">{filterContent}</div>;
};
