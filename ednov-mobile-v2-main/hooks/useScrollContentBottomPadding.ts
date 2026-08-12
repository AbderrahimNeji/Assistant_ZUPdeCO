import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsWebDesktop } from '@/hooks/useWebDesktop';

/**
 * Bottom padding for scroll content on tab screens. Matches the tab bar footprint in
 * app/(tabs)/_layout.tsx (including web desktop’s slightly taller bar).
 */
export function useScrollContentBottomPadding(): number {
  const insets = useSafeAreaInsets();
  const isWebDesktop = useIsWebDesktop();

  /** Desktop web uses a side nav — no bottom tab bar. */
  if (Platform.OS === 'web' && isWebDesktop) {
    return Math.max(insets.bottom, 12) + 28;
  }

  const tabBarHeight =
    Platform.OS === 'ios'
      ? 88 + insets.bottom
      : Platform.OS === 'web'
        ? 64 + insets.bottom
        : 64 + insets.bottom;

  return tabBarHeight + 20;
}
