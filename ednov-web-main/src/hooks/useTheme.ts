import { useThemeStore } from '@/stores/themeStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useMutation } from '@tanstack/react-query';
import { updateUserPreferences } from '@/services/preferences.service';

export const useTheme = () => {
  const { isDarkMode, setDarkMode, logos, colors } = useThemeStore();
  const updateDarkMode = usePreferencesStore((state) => state.updateDarkMode);

  const { mutate: saveThemePreference } = useMutation({
    mutationFn: (isDark: boolean) => updateUserPreferences({ isDarkMode: isDark }),
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setDarkMode(newMode);
    updateDarkMode(newMode);
    saveThemePreference(newMode);
  };

  const setTheme = (isDark: boolean) => {
    setDarkMode(isDark);
    updateDarkMode(isDark);
    saveThemePreference(isDark);
  };

  return {
    isDarkMode,
    logos,
    colors,
    toggleTheme,
    setDarkMode: setTheme,
    isTogglingTheme: false,
  };
};
