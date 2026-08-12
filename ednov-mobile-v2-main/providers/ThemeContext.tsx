'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme | null) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ednov_color_scheme';

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const systemScheme = useRNColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setOverride(stored);
        }
      })
      .catch(() => {/* ignore read errors */})
      .finally(() => setHydrated(true));
  }, []);

  // Persist whenever the override changes (skip pre-hydration writes)
  useEffect(() => {
    if (!hydrated) return;
    if (override === null) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(STORAGE_KEY, override).catch(() => {});
    }
  }, [override, hydrated]);

  const colorScheme: ColorScheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const setColorScheme = useCallback((scheme: ColorScheme | null) => {
    setOverride(scheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setOverride((prev) => {
      const current = prev ?? (systemScheme === 'dark' ? 'dark' : 'light');
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ colorScheme, setColorScheme, toggleTheme }),
    [colorScheme, setColorScheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
