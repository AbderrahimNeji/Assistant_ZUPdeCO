/**
 * Shared button component with consistent touch targets (≥44pt) and variants.
 * Pressable only controls opacity; all background/layout live on an inner View
 * so Android never paints over the background via the native Pressable layer.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, spacing } from '@/constants/DesignTokens';
import { MIN_TOUCH_TARGET_HEIGHT } from '@/constants/Layout';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: object;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: Readonly<AppButtonProps>) {
  const colors = useDynamicColors();

  const variantStyles = getVariantStyles(colors, variant);
  const textColor =
    variant === 'primary' || variant === 'success' ? colors.background : variantStyles.textColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => {
        const opacity = disabled ? 0.45 : pressed ? 0.75 : 1;
        return { opacity, ...style };
      }}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      testID={testID}
    >
      <View style={[styles.base, variantStyles.container]}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <View style={styles.content}>
            {icon ? (
              <MaterialCommunityIcons
                name={icon}
                size={20}
                color={textColor}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function getVariantStyles(colors: ReturnType<typeof useDynamicColors>, variant: AppButtonVariant) {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: colors.tint },
        textColor: colors.background,
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: colors.backgroundSecondary,
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        textColor: colors.text,
      };
    case 'danger':
      return {
        container: {
          backgroundColor: colors.backgroundSecondary,
          borderWidth: 1.5,
          borderColor: colors.danger + '60',
        },
        textColor: colors.danger,
      };
    case 'success':
      return {
        container: {
          backgroundColor: (colors as { success?: string }).success ?? '#22c55e',
        },
        textColor: colors.background,
      };
    default:
      return getVariantStyles(colors, 'primary');
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET_HEIGHT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
