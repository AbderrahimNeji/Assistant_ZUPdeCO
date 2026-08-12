import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { ActivityFeedRow } from '@/components/ActivityFeedRow';
import { Text } from '@/components/Themed';
import { SectionTitle } from '@/components/SectionTitle';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { CONTENT_PADDING_HORIZONTAL, borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CrSubmittedPayload, SessionCompletedPayload } from '@/types/activityFeed';

const FEED_LIMIT = 50;

export default function HistoriqueScreen() {
  const colors = useDynamicColors();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useActivityFeed(FEED_LIMIT);

  const headerOffsetStyle = { flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET };

  if (isLoading) {
    return (
      <View style={headerOffsetStyle}>
        <LoadingScreen message="Chargement de l'historique…" backgroundColor={colors.pageBackground} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={headerOffsetStyle}>
        <ErrorMessage
          title="Historique indisponible"
          message="Impossible de charger l'historique. Réessayez."
          onRetry={() => {
            refetch();
          }}
        />
      </View>
    );
  }

  const items = data ?? [];
  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  return (
    <View style={headerOffsetStyle}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
          paddingTop: spacing.lg,
          paddingBottom: scrollBottom,
        }}
      >
        <SectionTitle style={{ marginBottom: spacing.md }}>Activité récente</SectionTitle>
        {items.length === 0 ? (
          <View style={[cardStyle, { padding: spacing.xl, alignItems: 'center' }]}>
            <MaterialCommunityIcons name="history" size={48} color={colors.textSecondary} />
            <Text style={{ marginTop: spacing.md, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
              Aucune activité pour le moment
            </Text>
          </View>
        ) : (
          items.map((item) => {
            let onPress: (() => void) | undefined;
            if (item.type === 'session_completed') {
              onPress = () => router.push(`/(tabs)/sessions/${(item.payload as SessionCompletedPayload).sessionId}` as never);
            } else if (item.type === 'cr_submitted') {
              onPress = () => router.push('/(tabs)/comptes-rendus' as never);
            }
            return (
              <ActivityFeedRow
                key={item.id}
                item={item}
                colors={colors}
                cardStyle={cardStyle}
                onPress={onPress}
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
