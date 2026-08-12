import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemeContext } from '@/providers/ThemeContext';

/** Returns the resolved color scheme (theme context override or system). */
export function useColorScheme(): 'light' | 'dark' {
  const theme = useThemeContext();
  const system = useRNColorScheme();
  if (theme) return theme.colorScheme;
  return system === 'dark' ? 'dark' : 'light';
}
