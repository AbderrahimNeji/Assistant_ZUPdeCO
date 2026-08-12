import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing, typography } from '@/constants/DesignTokens';
import { useSessions } from '@/hooks/useSessions';
import type { CalendarEvent } from '@/types/calendar';
import { sessionsToCalendarEvents } from '@/types/calendar';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const DAY_NAMES = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

function eventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return events
    .filter((e) => {
      const ed = new Date(e.date);
      return ed.getFullYear() === y && ed.getMonth() === m && ed.getDate() === d;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export default function CalendarScreen() {
  const params = useLocalSearchParams<{ initialDate?: string; viewMode?: 'month' | 'day' }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const { data: sessions = [], error, isLoading, isRefetching, refetch } = useSessions();

  const calendarEvents = useMemo(
    () => sessionsToCalendarEvents(sessions as { id: string; date: string; studentName?: string }[]),
    [sessions]
  );

  const initialDate = useMemo(() => {
    if (params.initialDate) {
      const d = new Date(params.initialDate);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [params.initialDate]);

  const initialViewMode = params.viewMode === 'day' ? 'day' : 'month';

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<'month' | 'day'>(initialViewMode);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayJs = new Date(year, month, 1).getDay();
  const firstDay = firstDayJs === 0 ? 6 : firstDayJs - 1;

  const today = new Date();
  const dayEvents = useMemo(() => eventsForDay(calendarEvents, currentDate), [calendarEvents, currentDate]);
  const cardShadow = useMemo(() => getCardShadowPlatform(isDark), [isDark]);

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'day') {
        next.setDate(prev.getDate() + (dir === 'next' ? 1 : -1));
      } else {
        next.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      }
      return next;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setViewMode('day');
  };

  const dayLabel = `${DAY_NAMES[currentDate.getDay()]} ${currentDate.getDate()} ${MONTH_NAMES[month]} ${year}`;

  if (isLoading && sessions === undefined) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingScreen message="Chargement du calendrier…" backgroundColor={colors.background} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ErrorMessage
          title="Impossible de charger le calendrier"
          message={error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez plus tard.'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Calendrier</Text>
        <Pressable onPress={goToToday} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.todayBtn, { color: colors.tint }]}>Aujourd'hui</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.tint}
          />
        }
      >
        <View style={[styles.navBar, { backgroundColor: colors.backgroundSecondary, ...cardShadow }]}>
          <Pressable onPress={() => navigate('prev')} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.tint} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            {viewMode === 'month' ? monthLabel : dayLabel}
          </Text>
          <Pressable onPress={() => navigate('next')} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={colors.tint} style={{ alignSelf: 'center' }} />
          </Pressable>
        </View>

        {viewMode === 'month' && (
          <View style={[styles.card, { backgroundColor: colors.backgroundCalendar, ...cardShadow }]}>
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((d, i) => (
                <View key={i} style={styles.weekCell}>
                  <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={styles.grid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`e-${i}`} style={styles.dayCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDate = new Date(year, month, day);
                const hasEvent = calendarEvents.some((e) => {
                  const ed = new Date(e.date);
                  return ed.getFullYear() === year && ed.getMonth() === month && ed.getDate() === day;
                });
                const dayIsToday = isSameDay(dayDate, today);

                return (
                  <Pressable
                    key={day}
                    style={styles.dayCell}
                    onPress={() => {
                      setCurrentDate(dayDate);
                      setViewMode('day');
                    }}
                  >
                    <View
                      style={[
                        styles.dayInner,
                        { borderColor: colors.border },
                        dayIsToday && { backgroundColor: colors.tint, borderColor: colors.tint },
                        hasEvent && !dayIsToday && { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          { color: colors.text },
                          dayIsToday && { color: isDark ? colors.text : '#fff', fontWeight: '700' },
                          hasEvent && !dayIsToday && { color: colors.tint, fontWeight: '600' },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {viewMode === 'day' && (
          <View style={[styles.card, { backgroundColor: colors.backgroundCalendar, ...cardShadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Séances</Text>
            {dayEvents.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune séance ce jour-là
              </Text>
            ) : (
              dayEvents.map((event) => (
                <Pressable
                  key={event.id}
                  style={[styles.eventRow, { backgroundColor: colors.tint + '0D' }]}
                  onPress={() => router.push(`/(tabs)/sessions/${event.id}` as never)}
                >
                  <View style={[styles.eventIconWrap, { backgroundColor: colors.tint + '18' }]}>
                    <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.tint} />
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
                      {event.time ?? '—'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  todayBtn: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 32,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  navTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    ...typography.bodySmall,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMedium,
    fontStyle: 'italic',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  eventIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  eventMeta: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});
