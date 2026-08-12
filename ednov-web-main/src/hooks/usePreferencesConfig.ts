import { useMutation } from '@tanstack/react-query';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { updateInterfaceConfig as updateInterfaceConfigAPI } from '@/services/preferences.service';
import { getUserPreferences } from '@/services/preferences.service';
import { toast } from '@/lib/toast';

export const usePreferencesConfig = (interfaceName: string) => {
  const { preferences, isLoaded, getInterfaceConfig, updateInterfaceConfig, setPreferences } =
    usePreferencesStore();

  const config = getInterfaceConfig(interfaceName);

  const { mutate: saveConfig, isPending: isSaving } = useMutation({
    mutationFn: (newConfig: Record<string, unknown>) =>
      updateInterfaceConfigAPI(interfaceName, newConfig),
    onMutate: (newConfig) => {
      // Optimistic update du store
      updateInterfaceConfig(interfaceName, newConfig);
    },
    onError: async () => {
      // Re-fetch en cas d'erreur pour restaurer l'état correct
      try {
        const freshPrefs = await getUserPreferences();
        setPreferences(freshPrefs);
      } catch (refetchError) {
        console.error('Failed to refetch preferences:', refetchError);
      }
      toast.error('Erreur lors de la sauvegarde des préférences');
    },
  });

  return {
    config,
    isLoaded,
    saveConfig,
    isSaving,
    preferences,
  };
};
