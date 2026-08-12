import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { classifySpeaker, type ScriptTurn } from '@/utils/scriptParser';

export interface ScriptTurnBubbleProps {
  turn: ScriptTurn;
  index: number;
  /** When true, bubble is more compact (e.g. for preview). */
  compact?: boolean;
}

export function ScriptTurnBubble({ turn, index, compact = false }: Readonly<ScriptTurnBubbleProps>) {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const isTuteur = turn.speaker === 'tuteur';
  const isEleve = turn.speaker === 'eleve';

  const successColor = (colors as { success?: string }).success ?? '#22c55e';

  let accentColor: string;
  if (isTuteur) accentColor = colors.tint;
  else if (isEleve) accentColor = successColor;
  else accentColor = colors.textSecondary;

  let bubbleBg: string;
  if (isDark) {
    if (isTuteur) bubbleBg = colors.tint + '22';
    else if (isEleve) bubbleBg = successColor + '18';
    else bubbleBg = colors.backgroundSecondary;
  } else if (isTuteur) {
    bubbleBg = colors.tint + '12';
  } else if (isEleve) {
    bubbleBg = successColor + '10';
  } else {
    bubbleBg = colors.backgroundSecondary;
  }

  const icon: 'account-tie-outline' | 'account-school-outline' | 'account-outline' = isTuteur
    ? 'account-tie-outline'
    : isEleve
      ? 'account-school-outline'
      : 'account-outline';

  const roleLabel = isTuteur ? 'Tuteur' : isEleve ? 'Élève' : `Intervenant ${index + 1}`;

  const normalizedSpeakerLabel = turn.label.trim();
  const hasDistinctCustomLabel =
    normalizedSpeakerLabel.length > 0 && classifySpeaker(normalizedSpeakerLabel) === 'unknown';

  const isRight = isEleve;
  const marginBottom = compact ? spacing.sm : spacing.md;
  const maxWidth = compact ? '90%' : '85%';

  return (
    <View
      style={{
        marginBottom,
        alignItems: isRight ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          flexDirection: isRight ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.xs,
          paddingHorizontal: 2,
        }}
      >
        <View
          style={{
            flexDirection: isRight ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderRadius: borderRadius.full ?? 999,
            borderWidth: 1,
            borderColor: accentColor + '40',
            backgroundColor: isDark ? accentColor + '22' : accentColor + '16',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <MaterialCommunityIcons name={icon} size={14} color={accentColor} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: accentColor,
              letterSpacing: 0.2,
            }}
          >
            {roleLabel}
          </Text>
        </View>

        {hasDistinctCustomLabel && (
          <View
            style={{
              borderRadius: borderRadius.full ?? 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.backgroundSecondary,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {normalizedSpeakerLabel}
            </Text>
          </View>
        )}
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: accentColor + 'B3',
          }}
        />
      </View>

      <View
        style={{
          maxWidth,
          backgroundColor: bubbleBg,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: accentColor + '30',
          paddingHorizontal: spacing.md,
          paddingVertical: compact ? spacing.xs + 2 : spacing.sm + 2,
          ...getCardShadowPlatform(isDark),
          borderTopLeftRadius: isRight ? borderRadius.lg : borderRadius.sm,
          borderTopRightRadius: isRight ? borderRadius.sm : borderRadius.lg,
        }}
      >
        <Text
          style={{
            fontSize: compact ? 13 : 14,
            color: colors.text,
            lineHeight: compact ? 20 : 22,
          }}
          selectable
          numberOfLines={compact ? 3 : undefined}
        >
          {turn.text}
        </Text>
      </View>
    </View>
  );
}
