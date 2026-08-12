import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserPreferences, InterfaceConfig } from '@/types/user.types';

interface PreferencesStore {
  preferences: UserPreferences | null;
  isLoaded: boolean;

  // Actions
  setPreferences: (prefs: UserPreferences) => void;
  updateInterfaceConfig: (interfaceName: string, config: Record<string, unknown>) => void;
  updateDarkMode: (isDark: boolean) => void;
  clearPreferences: () => void;

  // Selectors
  getInterfaceConfig: (interfaceName: string) => InterfaceConfig[string] | undefined;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      preferences: null,
      isLoaded: false,

      setPreferences: (prefs: UserPreferences) => {
        set({ preferences: prefs, isLoaded: true });
      },

      updateInterfaceConfig: (interfaceName: string, config: Record<string, unknown>) => {
        set((state) => {
          if (!state.preferences) return state;

          return {
            preferences: {
              ...state.preferences,
              interfaceConfigs: {
                ...state.preferences.interfaceConfigs,
                [interfaceName]: config,
              },
            },
          };
        });
      },

      updateDarkMode: (isDark: boolean) => {
        set((state) => {
          if (!state.preferences) return state;

          return {
            preferences: {
              ...state.preferences,
              isDarkMode: isDark,
            },
          };
        });
      },

      clearPreferences: () => {
        set({ preferences: null, isLoaded: false });
      },

      getInterfaceConfig: (interfaceName: string) => {
        const state = get();
        if (!state.preferences) return undefined;
        return state.preferences.interfaceConfigs[interfaceName];
      },
    }),
    {
      name: 'ednov-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
