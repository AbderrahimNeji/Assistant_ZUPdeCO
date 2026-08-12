import { Platform } from 'react-native';

/** Minimum touch target height (iOS HIG / Material). Use for buttons and list rows. */
export const MIN_TOUCH_TARGET_HEIGHT = 44;

/** Tab bar height heuristic for static layouts; prefer useScrollContentBottomPadding() on tab screens. */
export const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 64 : 82;

/** Bottom inset for the floating tab bar; matches app/(tabs)/_layout.tsx. */
export const TAB_BAR_BOTTOM_INSET = Platform.OS === 'ios' ? 28 : 16;

/** Use as contentContainerStyle.paddingBottom for ScrollView/FlatList on tab screens so content is not hidden behind the tab bar. */
export const SCROLL_CONTENT_BOTTOM_PADDING = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_INSET + 20;

/** Offset from bottom for a FAB that sits above the tab bar (e.g. "Saisir un CR"). */
export const FAB_ABOVE_TAB_BAR = TAB_BAR_BOTTOM_INSET + TAB_BAR_HEIGHT + 10;

/**
 * Dynamic FAB bottom offset aligned with app/(tabs)/_layout.tsx tab bar height.
 * Use this instead of FAB_ABOVE_TAB_BAR when insets are available for correct positioning.
 */
export function getFabBottomOffset(
  insets: { bottom: number },
  options?: { webDesktop?: boolean },
): number {
  if (Platform.OS === 'web' && options?.webDesktop) {
    return Math.max(insets?.bottom ?? 0, 12) + 24;
  }
  const tabBarHeight =
    Platform.OS === 'ios'
      ? 88
      : Platform.OS === 'web'
        ? 64
        : 64;
  return tabBarHeight + (insets?.bottom ?? 0) + 12;
}

/**
 * Dynamic scroll content bottom padding for tab screens. Use when insets are available
 * to ensure content clears the tab bar and home indicator on notched devices.
 */
export function getScrollContentBottomPadding(
  insets: { bottom?: number },
  options?: { webDesktop?: boolean },
): number {
  if (Platform.OS === 'web' && options?.webDesktop) {
    return Math.max(insets?.bottom ?? TAB_BAR_BOTTOM_INSET, 12) + 28;
  }
  const tabBarHeight =
    Platform.OS === 'ios'
      ? 88
      : Platform.OS === 'web'
        ? 64
        : 64;
  return tabBarHeight + (insets?.bottom ?? TAB_BAR_BOTTOM_INSET) + 20;
}
