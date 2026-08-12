import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ListSkeleton';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, CARD_PADDING_HORIZONTAL, CONTENT_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { MIN_TOUCH_TARGET_HEIGHT } from '@/constants/Layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAttendanceHistoryInfinite } from '@/hooks/useAttendanceHistory';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useReduceMotionEnabled } from '@/hooks/useReduceMotionEnabled';
import { triggerLight } from '@/utils/haptics';
import {
  type AttendanceHistoryEntry,
  type AttendanceStatus,
  type Session,
  getSessionParticipantDisplayLabel,
} from '@/types/session';

function getAttendanceLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'present': return 'Présent';
    case 'absent': return 'Absent';
    case 'excused': return 'Excusé';
    case 'pending': return 'En attente';
    default: return 'En attente';
  }
}

function getAttendanceStatusColor(status: AttendanceStatus, colors: ColorPalette): string {
  switch (status) {
    case 'present': return colors.success;
    case 'absent': return colors.danger;
    case 'excused': return colors.warning;
    case 'pending':
    default: return colors.info;
  }
}

function getFormatLabel(session: Session): string {
  if (session.format === 'visio') return 'Visio';
  if (session.format === 'hybrid') return 'Hybride';
  if (session.format === 'presentiel') return 'Présentiel';
  return session.joinLink?.trim() ? 'Visio' : 'Présentiel';
}

function formatSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function HistoryCard({
  entry,
  expanded,
  onPress,
  onSessionPress,
  colors,
  isDark,
}: Readonly<{
  entry: AttendanceHistoryEntry;
  expanded: boolean;
  onPress: () => void;
  onSessionPress: (session: Session) => void;
  colors: ColorPalette;
  isDark: boolean;
}>) {
  const { session, participants } = entry;
  const studentParticipants = participants.filter((p) => p.role === 'student');

  const cardContainerStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.tint,
    marginBottom: spacing.md,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  return (
    <View style={cardContainerStyle}>
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'nowrap',
          minHeight: MIN_TOUCH_TARGET_HEIGHT,
          paddingVertical: spacing.lg,
          paddingHorizontal: CARD_PADDING_HORIZONTAL,
          opacity: pressed ? 0.75 : 1,
        })}
        accessibilityLabel={`Séance du ${formatSessionDate(session.date)}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        {/* Left: date + format — safe padding so text is never clipped */}
        <View style={{ flex: 1, minWidth: 0, paddingLeft: spacing.sm, paddingRight: spacing.sm }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 21 }} numberOfLines={2}>
            {formatSessionDate(session.date)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <MaterialCommunityIcons
              name={session.format === 'visio' || session.format === 'hybrid' ? 'video-outline' : 'map-marker-outline'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={1}>
              {getFormatLabel(session)}
            </Text>
          </View>
        </View>
        {/* Chevron on the right */}
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={26}
          color={colors.textSecondary}
          style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }}
        />
      </Pressable>
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: CARD_PADDING_HORIZONTAL + spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.md }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Présence
          </Text>
          {studentParticipants.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 21 }}>Aucun élève assigné</Text>
          ) : (
            studentParticipants.map((p) => {
              const name = getSessionParticipantDisplayLabel(p, 'Élève');
              const statusColor = getAttendanceStatusColor(p.attendanceStatus, colors);
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: MIN_TOUCH_TARGET_HEIGHT,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, lineHeight: 20 }} numberOfLines={1}>{name}</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: statusColor + '18',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: borderRadius.sm,
                      borderWidth: 1,
                      borderColor: statusColor + '40',
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>
                      {getAttendanceLabel(p.attendanceStatus)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          <AppButton
            title="Voir le détail"
            onPress={() => onSessionPress(session)}
            variant="primary"
            icon="chevron-right"
            accessibilityLabel="Voir le détail de la séance"
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}
    </View>
  );
}

export default function AttendanceHistoryScreen() {
  const colors = useDynamicColors();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const router = useRouter();
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, isRefetching, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useAttendanceHistoryInfinite();
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  const handleSessionPress = (session: Session) => {
    router.push(`/(tabs)/sessions/${session.id}` as never);
  };

  if (isLoading && items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
        <View style={contentSheetStyle}>
          <ListSkeleton count={6} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
        <View style={contentSheetStyle}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
              paddingTop: spacing.lg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 400,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                borderLeftWidth: 4,
                borderLeftColor: colors.tint,
                borderRadius: borderRadius.lg,
                padding: spacing.xl,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <Text style={{ fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 22 }}>
                Impossible de charger l'historique. Réessayez.
              </Text>
              <AppButton
                title="Réessayer"
                onPress={() => refetch()}
                variant="primary"
                icon="refresh"
                accessibilityLabel="Réessayer"
                style={{ marginTop: spacing.lg }}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.session.id}
          contentContainerStyle={{
            paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            paddingTop: spacing.md,
            paddingBottom: scrollBottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.tint}
            />
          }
          renderItem={({ item }) => (
            <HistoryCard
              entry={item}
              expanded={expandedId === item.session.id}
              onPress={() => {
                triggerLight();
                if (!reduceMotionEnabled) {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                }
                setExpandedId((id) => (id === item.session.id ? null : item.session.id));
              }}
              onSessionPress={handleSessionPress}
              colors={colors}
              isDark={isDark}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-clock-outline"
              title="Aucune séance passée"
              message="Vos séances passées avec les présences apparaîtront ici."
            />
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasNextPage && items.length > 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <AppButton
                    title="Charger plus"
                    onPress={() => fetchNextPage()}
                    variant="secondary"
                    icon="chevron-down"
                    accessibilityLabel="Charger plus"
                  />
                )}
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}
