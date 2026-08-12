import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Themed';
import { CARD_PADDING_HORIZONTAL, spacing } from '@/constants/DesignTokens';
import { useDynamicColors } from '@/providers/BrandingProvider';
import type {
  ActivityFeedItem,
  BadgeAwardedPayload,
  CrSubmittedPayload,
  SessionCompletedPayload,
} from '@/types/activityFeed';

export function formatFeedDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ActivityFeedRow({
  item,
  colors,
  cardStyle,
  onPress,
}: Readonly<{
  item: ActivityFeedItem;
  colors: ReturnType<typeof useDynamicColors>;
  cardStyle: object;
  onPress?: () => void;
}>) {
  let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'circle-outline';
  let title = '';
  let subtitle: string | null = null;

  if (item.type === 'session_completed') {
    const p = item.payload as SessionCompletedPayload;
    iconName = 'calendar-check';
    title = 'Séance réalisée';
    subtitle = p.establishmentName
      ? `${p.establishmentName} · ${p.sessionDate} ${p.startTime}`
      : `${p.sessionDate} ${p.startTime}`;
  } else if (item.type === 'cr_submitted') {
    const p = item.payload as CrSubmittedPayload;
    iconName = 'file-document-check';
    title = 'Compte rendu soumis';
    subtitle = p.sessionDate ? `Séance du ${p.sessionDate}` : null;
  } else if (item.type === 'badge_awarded') {
    const p = item.payload as BadgeAwardedPayload;
    iconName = (p.badgeIcone as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'medal';
    title = 'Badge obtenu';
    subtitle = p.badgeNom;
  }

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: CARD_PADDING_HORIZONTAL, flexWrap: 'nowrap' }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.tint + '18',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        }}
      >
        <MaterialCommunityIcons name={iconName} size={22} color={colors.tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{formatFeedDate(item.date)}</Text>
      </View>
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
      ) : null}
    </View>
  );

  if (onPress && (item.type === 'session_completed' || item.type === 'cr_submitted')) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.9 : 1 }]}
        accessibilityLabel={title}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{content}</View>;
}
