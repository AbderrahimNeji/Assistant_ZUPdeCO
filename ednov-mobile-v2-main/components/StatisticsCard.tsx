import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HelpHint } from '@/components/HelpHint';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';

export type StatisticsCardColor = 'emerald' | 'blue' | 'red' | 'amber' | 'orange';

const colorMap: Record<
  StatisticsCardColor,
  { bg: string; icon: string; text: string }
> = {
  emerald: { bg: '#D1FAE5', icon: '#10b981', text: '#065F46' },
  blue: { bg: '#DBEAFE', icon: '#3B82F6', text: '#1E40AF' },
  red: { bg: '#FEE2E2', icon: '#EF4444', text: '#991B1B' },
  amber: { bg: '#FEF3C7', icon: '#F59E0B', text: '#92400E' },
  orange: { bg: '#FED7AA', icon: '#F97316', text: '#9A3412' },
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface StatisticsCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly icon: IconName;
  readonly color: StatisticsCardColor;
  readonly accessibilityLabel?: string;
  /** Explains what the figure measures (tooltip / long-press). */
  readonly hint?: string;
}

export function StatisticsCard({
  title,
  value,
  icon,
  color,
  accessibilityLabel,
  hint,
}: Readonly<StatisticsCardProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const cardColors = colorMap[color];
  const isDark = colorScheme === 'dark';
  const cardShadow = getCardShadowPlatform(isDark);
  const cardBackground = isDark ? colors.backgroundSecondary : colors.background;
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.38)' : colors.subtleBorder;
  const titleColor = isDark ? '#e5e5e5' : colors.textSecondary;
  const iconTintBg = `${cardColors.icon}${isDark ? '33' : '12'}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: cardBorderColor,
          padding: spacing.md,
          ...(Platform.OS === 'android'
            ? { elevation: cardShadow.elevation }
            : {
                shadowColor: cardShadow.shadowColor,
                shadowOffset: cardShadow.shadowOffset,
                shadowOpacity: cardShadow.shadowOpacity,
                shadowRadius: cardShadow.shadowRadius,
              }),
        },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="summary"
    >
      <View style={[styles.iconContainer, { backgroundColor: iconTintBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={cardColors.icon} />
      </View>
      <Text
        style={[styles.value, { color: cardColors.icon }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={[styles.title, { color: titleColor }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hintCorner: {
    position: 'absolute',
    top: 4,
    right: 2,
    zIndex: 1,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    minHeight: 100,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
});
