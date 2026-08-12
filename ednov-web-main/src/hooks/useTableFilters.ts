import * as React from 'react';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { updateInterfaceConfig } from '@/services/preferences.service';

interface UseTableFiltersOptions<T, F> {
  data: T[];
  filterFn: (item: T, filters: F) => boolean;
  defaultFilters: F;
  persistenceKey?: string;
}

export const useTableFilters = <T, F>(options: UseTableFiltersOptions<T, F>) => {
  const { getInterfaceConfig, updateInterfaceConfig: updateStore } = usePreferencesStore();
  const [filters, setFilters] = React.useState<F>(options.defaultFilters);
  const [showFilters, setShowFilters] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const interfaceConfig = options.persistenceKey
    ? getInterfaceConfig(options.persistenceKey)
    : null;

  // Charger les filtres sauvegardés
  React.useEffect(() => {
    if (!options.persistenceKey || !interfaceConfig) return;

    const savedFilters =
      interfaceConfig &&
      typeof interfaceConfig === 'object' &&
      interfaceConfig !== null &&
      'filters' in interfaceConfig
        ? (interfaceConfig.filters as F | undefined)
        : undefined;

    if (savedFilters) {
      setFilters(savedFilters);
    }
  }, [interfaceConfig, options.persistenceKey]);

  const filteredData = React.useMemo(() => {
    return options.data.filter((item) => options.filterFn(item, filters));
  }, [options, filters]);

  const hasActiveFilters = React.useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(options.defaultFilters);
  }, [filters, options.defaultFilters]);

  const clearFilters = React.useCallback(() => {
    setFilters(options.defaultFilters);
  }, [options.defaultFilters]);

  const saveFilters = React.useCallback(async () => {
    if (!options.persistenceKey) return;

    setIsSaving(true);

    // Optimistic update du store
    const currentConfig = (
      interfaceConfig && typeof interfaceConfig === 'object' ? interfaceConfig : {}
    ) as Record<string, unknown>;
    updateStore(options.persistenceKey, { ...currentConfig, filters });

    try {
      await updateInterfaceConfig(options.persistenceKey, { filters });
    } catch (error) {
      console.error('Failed to save filters:', error);
    } finally {
      setIsSaving(false);
    }
  }, [filters, options.persistenceKey, interfaceConfig, updateStore]);

  return {
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    filteredData,
    hasActiveFilters,
    clearFilters,
    saveFilters,
    isSaving,
  };
};
