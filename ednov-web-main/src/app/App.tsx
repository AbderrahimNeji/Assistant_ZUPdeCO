import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from './Router';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { SidebarConfig } from '@/types/user.types';
import '@/styles/layout.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { setDarkMode, applyTheme } = useThemeStore();
  const { loadSidebarState } = useLayoutStore();
  const preferences = usePreferencesStore((state) => state.preferences);

  // Apply user preferences when loaded from preferencesStore
  useEffect(() => {
    if (preferences) {
      setDarkMode(preferences.isDarkMode);

      // Load sidebar state from preferences
      const sidebarConfig = preferences.interfaceConfigs?.sidebar;
      if (sidebarConfig) {
        loadSidebarState(sidebarConfig as SidebarConfig);
      }
    }
  }, [preferences, setDarkMode, loadSidebarState]);

  // Apply theme on mount and when dependencies change
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  return <Router />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
