import * as React from 'react';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { updateInterfaceConfig } from '@/services/preferences.service';
import type { ViewMode } from '@/types/data-table.types';

export interface UseViewModeOptions {
  tableName: string;
  defaultMode?: ViewMode;
}

export const useViewMode = (tableName: string, defaultMode: ViewMode = 'list') => {
  const { getInterfaceConfig, updateInterfaceConfig: updateStore } = usePreferencesStore();
  const [isSaving, setIsSaving] = React.useState(false);

  const tableConfig = getInterfaceConfig(tableName);

  // Initialisation synchrone depuis le store Zustand (persist localStorage)
  // pour éviter un double appel API (list→cards) lors du chargement initial.
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const config = usePreferencesStore.getState().getInterfaceConfig(tableName);
    if (config && typeof config === 'object' && 'defaultView' in config) {
      const savedMode = (config as { defaultView?: unknown }).defaultView;
      if (savedMode === 'list' || savedMode === 'cards') return savedMode;
    }
    return defaultMode;
  });

  // Synchronise si les préférences changent depuis le backend après le premier render
  React.useEffect(() => {
    if (tableConfig && typeof tableConfig === 'object' && 'defaultView' in tableConfig) {
      const savedMode = tableConfig.defaultView;
      if (savedMode === 'list' || savedMode === 'cards') {
        setViewMode(savedMode);
      }
    }
  }, [tableConfig]);

  const changeViewMode = React.useCallback(
    async (mode: ViewMode) => {
      setViewMode(mode);
      setIsSaving(true);

      // Optimistic update du store
      const currentConfig = (
        tableConfig && typeof tableConfig === 'object' ? tableConfig : {}
      ) as Record<string, unknown>;
      updateStore(tableName, { ...currentConfig, defaultView: mode });

      try {
        // Sauvegarder sur le backend
        await updateInterfaceConfig(tableName, { defaultView: mode });
      } catch (error) {
        console.error('Failed to save view mode:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [tableName, tableConfig, updateStore],
  );

  return {
    viewMode,
    setViewMode: changeViewMode,
    isLoading: false,
    isSaving,
  };
};
