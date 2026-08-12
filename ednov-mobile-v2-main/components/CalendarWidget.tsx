import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing, typography } from '@/constants/DesignTokens';
import type { CalendarEvent } from '@/types/calendar';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export interface CalendarWidgetProps {
  events: CalendarEvent[];
  onDatePress?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
  onOpenFullScreen?: () => void;
}

function eventsInMonth(events: CalendarEvent[], year: number, month: number): CalendarEvent[] {
  return events
    .filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function eventsForDay(events: CalendarEvent[], year: number, month: number, day: number): CalendarEvent[] {
  return events.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

export function CalendarWidget({
  events,
  onDatePress,
  onEventPress,
  onOpenFullScreen,
}: CalendarWidgetProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayJs = new Date(year, month, 1).getDay();
  const firstDay = firstDayJs === 0 ? 6 : firstDayJs - 1;

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const monthEvents = useMemo(
    () => eventsInMonth(events, year, month),
    [events, year, month]
  );
  const displayEvents = monthEvents.slice(0, 3);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
      return next;
    });
  };

  const cardShadow = useMemo(() => getCardShadowPlatform(isDark), [isDark]);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCalendar, ...cardShadow }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigateMonth('prev')}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: colors.tint + '18', opacity: pressed ? 0.8 : 1 },
          ]}
          accessibilityLabel="Mois précédent"
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={colors.tint} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.text }]}>{monthLabel}</Text>
        <Pressable
          onPress={() => navigateMonth('next')}
          style={({ pressed }) => [
            styles.navBtn,
            { backgroundColor: colors.tint + '18', opacity: pressed ? 0.8 : 1 },
          ]}
          accessibilityLabel="Mois suivant"
        >
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.tint} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <View key={i} style={styles.weekCell}>
            <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayDate = new Date(year, month, day);
          const dayEvents = eventsForDay(events, year, month, day);
          const hasEvent = dayEvents.length > 0;
          const dayIsToday = isToday(day);

          return (
            <Pressable
              key={day}
              style={styles.dayCell}
              onPress={() => onDatePress?.(dayDate)}
              accessibilityLabel={`${day}${hasEvent ? `, ${dayEvents.length} séance(s)` : ''}`}
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
                {hasEvent && (
                  <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.badgeText, { color: colors.background }]}>{dayEvents.length}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.eventsSection, { borderTopColor: colors.border }]}>
        {displayEvents.length > 0 && (
          <>
            <View style={styles.eventsHeader}>
              <Text style={[styles.eventsTitle, { color: colors.text }]}>Événements</Text>
              {onOpenFullScreen && (
                <Pressable onPress={onOpenFullScreen} hitSlop={8}>
                  <MaterialCommunityIcons name="fullscreen" size={18} color={colors.tint} />
                </Pressable>
              )}
            </View>
            {displayEvents.map((event) => (
              <Pressable
                key={event.id}
                style={[styles.eventRow, { backgroundColor: colors.tint + '0D' }]}
                onPress={() => onEventPress?.(event)}
              >
                <View style={[styles.eventIconWrap, { backgroundColor: colors.tint + '18' }]}>
                  <MaterialCommunityIcons name="calendar-clock" size={14} color={colors.tint} />
                </View>
                <View style={styles.eventContent}>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {event.time ? ` • ${event.time}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
        {onOpenFullScreen && (
          <Pressable
            onPress={onOpenFullScreen}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, styles.viewAllBtn]}
          >
            <MaterialCommunityIcons name="calendar-multiple" size={18} color={colors.tint} />
            <Text style={[styles.viewAllText, { color: colors.tint }]}>Voir le calendrier complet</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    ...typography.titleMedium,
    fontWeight: '700',
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
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
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
    maxHeight: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  badge: {
    marginTop: 2,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  eventsSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventsTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  eventIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  eventMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  viewAllText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
});
