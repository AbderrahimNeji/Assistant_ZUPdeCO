import { Platform } from 'react-native';

/**
 * Design tokens aligned with v1 globalStyles (spacing, borderRadius, shadows, typography).
 * Use for consistent margins, paddings, card radii and shadows across v2.
 */

/** Spacing scale (16px base unit). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Horizontal padding for list/content areas. Use for FlatList/ScrollView contentContainerStyle
 * and card inner content to prevent text clipping and align with header margins.
 */
export const CONTENT_PADDING_HORIZONTAL = spacing.xl;

/** Inner padding for list item cards (prevents truncated text on edges). */
export const CARD_PADDING_HORIZONTAL = spacing.xl;

/** Border radius scale. */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Shadow presets (light mode). Dark mode should use getCardShadow for stronger shadow. */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

/**
 * Theme-aware card shadow: lighter in light mode, more pronounced in dark (v1 behaviour).
 */
export function getCardShadow(isDark: boolean): {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
} {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  };
}

/**
 * Platform-aware card shadow for list cards.
 * Android: elevation only (no shadow* props).
 * iOS: shadowColor, shadowOffset, shadowOpacity, shadowRadius (no elevation).
 */
export function getCardShadowPlatform(isDark: boolean): {
  elevation?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
} {
  const base = getCardShadow(isDark);
  if (Platform.OS === 'android') {
    return { elevation: 5 };
  }
  return {
    shadowColor: base.shadowColor,
    shadowOffset: base.shadowOffset,
    shadowOpacity: base.shadowOpacity,
    shadowRadius: base.shadowRadius,
  };
}

export type TypographyColors = {
  text: string;
  textSecondary: string;
};

/** Typography scale (v1-aligned). Returns theme-aware text styles when colors provided. */
export const typography = {
  headlineLarge: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  headlineMedium: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  headlineSmall: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  titleLarge: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  titleMedium: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
};

export function getTypographyStyles(colors: TypographyColors) {
  return {
    headlineLarge: { ...typography.headlineLarge, color: colors.text },
    headlineMedium: { ...typography.headlineMedium, color: colors.text },
    headlineSmall: { ...typography.headlineSmall, color: colors.text },
    titleLarge: { ...typography.titleLarge, color: colors.text },
    titleMedium: { ...typography.titleMedium, color: colors.text },
    bodyLarge: { ...typography.bodyLarge, color: colors.text },
    bodyMedium: { ...typography.bodyMedium, color: colors.textSecondary },
    bodySmall: { ...typography.bodySmall, color: colors.textSecondary },
    caption: { ...typography.caption, color: colors.textSecondary },
  };
}
