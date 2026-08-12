import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';

interface FilterConfigurePanelProps {
  allowedFilterIds: string[];
  filterVisibility: Record<string, boolean>;
  filterGroupLabels: Record<string, string>;
  onToggle: (id: string) => void;
  isSaving: boolean;
}

/**
 * Panel de configuration de la visibilité des filtres.
 * Affiche un bouton toggle par filtre autorisé.
 * Utilisé dans DataTableFilters (mode configureContent).
 */
export const FilterConfigurePanel: React.FC<FilterConfigurePanelProps> = ({
  allowedFilterIds,
  filterVisibility,
  filterGroupLabels,
  onToggle,
  isSaving,
}) => {
  if (allowedFilterIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {allowedFilterIds.map((id) => {
        const isOn = filterVisibility[id] ?? true;
        return (
          <Button
            key={id}
            variant="custom"
            size="sm"
            onClick={() => onToggle(id)}
            disabled={isSaving}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isSaving && 'opacity-60 cursor-not-allowed',
              isOn
                ? 'bg-[var(--color-2-nuance-1)] border-[var(--color-2-nuance-1)] text-white'
                : 'bg-transparent border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] text-muted-foreground hover:border-[var(--color-1-nuance-2)]',
            )}
          >
            {filterGroupLabels[id] ?? id}
          </Button>
        );
      })}
    </div>
  );
};
