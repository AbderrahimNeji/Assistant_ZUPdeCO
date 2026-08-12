import React from 'react';
import { Platform, View, type ViewProps } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';

type CardProps = ViewProps & {
  /** Larger shadow (e.g. for prominent sections). Default false. */
  elevated?: boolean;
  /** Flat style: border only, no shadow. Good for minimal layouts. */
  flat?: boolean;
  /** Primary-colored glow shadow — for highlighted/hero cards. */
  primaryGlow?: boolean;
};

export function Card({ style, elevated = false, flat = false, primaryGlow = false, ...props }: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';

  let shadowStyle: object;

  if (primaryGlow) {
    shadowStyle =
      Platform.OS === 'android'
        ? { elevation: 5 }
        : {
            shadowColor: colors.tint,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.12,
            shadowRadius: 10,
          };
  } else if (flat) {
    shadowStyle = { elevation: 0, borderWidth: 1, borderColor: colors.border };
  } else {
    const cardShadow = getCardShadowPlatform(isDark);
    shadowStyle =
      Platform.OS === 'android'
        ? { elevation: elevated ? (cardShadow.elevation ?? 0) + 1 : (cardShadow.elevation ?? 0) }
        : cardShadow;
  }

  return (
    <View
      style={[
        {
          borderRadius: borderRadius.xl,
          backgroundColor: colors.backgroundSecondary,
          padding: spacing.md,
          ...shadowStyle,
        },
        style,
      ]}
      {...props}
    />
  );
}
