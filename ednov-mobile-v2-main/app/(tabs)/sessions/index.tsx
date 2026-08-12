import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useScrollToTop } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ListSkeleton';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { SessionFilterModal } from '@/components/SessionFilterModal';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, CARD_PADDING_HORIZONTAL, CONTENT_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { MIN_TOUCH_TARGET_HEIGHT } from '@/constants/Layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useIsWebDesktop } from '@/hooks/useWebDesktop';
import { useAuth } from '@/providers/AuthProvider';
import { fetchSessionsPage, fetchSessionParticipants } from '@/services/sessions';
import { fetchSubjectsCatalog } from '@/services/subjects';
import { useSessionFilterStore } from '@/store/sessionFilterStore';
import {
  type Session,
  type SessionFilter,
  type SessionStatus,
  formatSessionStudentsTitle,
  sessionStudentCount,
  SESSION_NO_STUDENT_ASSIGNED_LABEL,
} from '@/types/session';
import { filterSessions, sessionFilterToApiDateRange } from '@/utils/sessionFilters';
import { getSessionStatusColor, getSessionStatusResolvedColor } from '@/utils/sessionDates';
import { triggerLight } from '@/utils/haptics';

const FILTERS: { value: SessionFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'upcoming', label: 'Prochaines' },
  { value: 'past', label: 'Passées' },
];

const LIST_PAGE_SIZE = 20;

function desktopVisiblePages(current: number, totalPages: number, max = 5): number[] {
  if (totalPages <= max) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (current <= 3) return Array.from({ length: max }, (_, i) => i + 1);
  if (current >= totalPages - 2) return Array.from({ length: max }, (_, i) => totalPages - max + i + 1);
  return Array.from({ length: max }, (_, i) => current - 2 + i);
}

function getFilterChipTextColor(
  isActive: boolean,
  isDark: boolean,
  colors: ColorPalette
): string {
  if (isActive) return isDark ? colors.text : colors.background;
  return colors.text;
}

function useFilteredSessions(
  sessionsList: Session[],
  sessionFilter: SessionFilter,
  statusFilter: SessionStatus | null,
  crStatusFilter: string | null,
  searchQuery: string
) {
  const filteredSessions = useMemo(() => {
    let list = filterSessions(sessionsList, sessionFilter);
    if (statusFilter) {
      list = list.filter((s) => (s.status ?? 'planned') === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0) return list;
    return list.filter((s) => {
      const dateStr = formatSessionDate(s.date).toLowerCase();
      const establishment = (s.establishment ?? '').toLowerCase();
      const room = (s.room ?? '').toLowerCase();
      return dateStr.includes(q) || establishment.includes(q) || room.includes(q);
    });
  }, [sessionsList, sessionFilter, statusFilter, searchQuery]);

  const activeFiltersCount =
    (sessionFilter === 'week' || sessionFilter === 'upcoming' || sessionFilter === 'past' ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (crStatusFilter ? 1 : 0);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    sessionFilter === 'week' ||
    sessionFilter === 'upcoming' ||
    sessionFilter === 'past' ||
    !!statusFilter ||
    !!crStatusFilter;

  return { filteredSessions, activeFiltersCount, hasActiveFilters };
}

function formatSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short',
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

function formatSessionDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatSessionTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function SessionListSeparator() {
  return <View style={{ height: spacing.md }} />;
}

function getFormatLabel(session: Session): string {
  if (session.format === 'visio') return 'Visio';
  if (session.format === 'hybrid') return 'Hybride';
  if (session.format === 'presentiel') return 'Présentiel';
  return session.joinLink?.trim() ? 'Visio' : 'Présentiel';
}

function isFormatVisioOrHybrid(session: Session): boolean {
  if (session.format === 'visio' || session.format === 'hybrid') return true;
  if (session.format != null) return false;
  return !!session.joinLink?.trim();
}

const DETAIL_ICON_SIZE = 36;
const STATUS_ACCENT_WIDTH = 4;

function getStatusAccentColor(status: SessionStatus | null | undefined, colors: ColorPalette): string {
  return getSessionStatusResolvedColor(getSessionStatusColor(status), colors);
}

function SessionCard({
  item,
  onPress,
  colors,
  isDark,
}: Readonly<{
  item: Session;
  onPress: () => void;
  colors: ColorPalette;
  isDark: boolean;
}>) {
  const legacyStudentName = (item as unknown as { studentName?: string }).studentName;
  const fromParticipants = formatSessionStudentsTitle(item.participants);
  const studentLabel =
    typeof legacyStudentName === 'string' && legacyStudentName.trim().length > 0
      ? legacyStudentName.trim()
      : fromParticipants;
  const studentCount = sessionStudentCount(item.participants);
  const hasLegacyStudentName =
    typeof legacyStudentName === 'string' && legacyStudentName.trim().length > 0;
  const sessionIntroLabel =
    !hasLegacyStudentName && studentCount === 0
      ? 'Séance :'
      : studentCount > 1
        ? 'Séance avec les élèves :'
        : "Séance avec l'élève :";
  const timeStr = formatSessionTime(item.date);
  const statusAccentColor = getStatusAccentColor(item.status, colors);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      accessibilityLabel={
        studentLabel === SESSION_NO_STUDENT_ASSIGNED_LABEL
          ? `${SESSION_NO_STUDENT_ASSIGNED_LABEL}, ${formatSessionDate(item.date)}`
          : `Séance avec ${studentLabel}, ${formatSessionDate(item.date)}`
      }
      accessibilityRole="button"
      accessibilityHint="Ouvre le détail de la séance"
    >
      <View
        style={{
          minHeight: 72,
          borderRadius: borderRadius.xl,
          backgroundColor: colors.background,
          padding: CARD_PADDING_HORIZONTAL,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: STATUS_ACCENT_WIDTH,
          borderLeftColor: statusAccentColor,
          overflow: 'hidden' as const,
          ...getCardShadowPlatform(isDark),
        }}
      >
      {/* Header: Séance avec l'élève : name + chevron on the right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'nowrap' }}>
        <View style={{ flex: 1, minWidth: 0, paddingLeft: spacing.xs }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>{sessionIntroLabel}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 }} numberOfLines={1}>
            {studentLabel}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={item.status ?? 'planned'} size="sm" variant="session" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons
                name={isFormatVisioOrHybrid(item) ? 'video-outline' : 'map-marker-outline'}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {getFormatLabel(item)}
              </Text>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
      </View>

      {/* Detail rows: Date, Heure (if available), Lieu — like web */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: DETAIL_ICON_SIZE,
              height: DETAIL_ICON_SIZE,
              borderRadius: DETAIL_ICON_SIZE / 2,
              backgroundColor: colors.info + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.info} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Date</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {formatSessionDateOnly(item.date)}
            </Text>
          </View>
        </View>

        {timeStr ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: DETAIL_ICON_SIZE,
                height: DETAIL_ICON_SIZE,
                borderRadius: DETAIL_ICON_SIZE / 2,
                backgroundColor: colors.tint + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="clock-outline" size={18} color={colors.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Heure</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{timeStr}</Text>
            </View>
          </View>
        ) : null}

        {(item.establishment || item.room) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: DETAIL_ICON_SIZE,
                height: DETAIL_ICON_SIZE,
                borderRadius: DETAIL_ICON_SIZE / 2,
                backgroundColor: colors.tint + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Lieu</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                {[item.establishment, item.room].filter(Boolean).join(' · ') || '—'}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
      </View>
    </Pressable>
  );
}

export default function SessionsListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const scrollBottom = useScrollContentBottomPadding();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);
  const { user } = useAuth();
  const isWebDesktop = useIsWebDesktop();
  const [desktopPage, setDesktopPage] = useState(1);
  const {
    sessionFilter,
    setSessionFilter,
    statusFilter,
    setStatusFilter,
    crStatusFilter,
    setCrStatusFilter,
    resetFilters,
  } = useSessionFilterStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  /** API order: asc for week/upcoming (paginate forward in time); desc for past and “all” (recent first per page). */
  const apiFilter = useMemo(() => {
    const listSort =
      sessionFilter === 'past'
        ? { sortBy: 'sessionDate', sortOrder: 'desc' as const }
        : sessionFilter === 'week' || sessionFilter === 'upcoming'
          ? { sortBy: 'sessionDate', sortOrder: 'asc' as const }
          : { sortBy: 'sessionDate', sortOrder: 'desc' as const };
    return {
      ...sessionFilterToApiDateRange(sessionFilter),
      ...(statusFilter ? { statuses: [statusFilter] as SessionStatus[] } : {}),
      ...listSort,
    };
  }, [sessionFilter, statusFilter]);

  React.useEffect(() => {
    setDesktopPage(1);
  }, [sessionFilter, statusFilter]);

  const pagedQuery = useQuery({
    queryKey: ['sessions', 'list', 'paged', apiFilter, desktopPage, LIST_PAGE_SIZE] as const,
    queryFn: () =>
      fetchSessionsPage({
        ...apiFilter,
        page: desktopPage,
        pageSize: LIST_PAGE_SIZE,
      }),
    enabled: !!user && isWebDesktop,
    placeholderData: (previousData) => previousData,
  });

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['sessions', 'list', 'infinite', apiFilter, LIST_PAGE_SIZE] as const,
    queryFn: ({ pageParam }) =>
      fetchSessionsPage({
        ...apiFilter,
        page: pageParam as number,
        pageSize: LIST_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const shown = last.page * last.pageSize;
      return shown < last.total ? last.page + 1 : undefined;
    },
    enabled: !!user && !isWebDesktop,
  });

  const sessionsList: Session[] = useMemo(() => {
    if (isWebDesktop) {
      return pagedQuery.data?.sessions ?? [];
    }
    const pages = infiniteQuery.data?.pages;
    if (!pages?.length) return [];
    const seen = new Set<string>();
    const out: Session[] = [];
    for (const p of pages) {
      for (const s of p.sessions) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
      }
    }
    return out;
  }, [isWebDesktop, pagedQuery.data?.sessions, infiniteQuery.data?.pages]);

  const { filteredSessions, activeFiltersCount, hasActiveFilters } = useFilteredSessions(
    sessionsList,
    sessionFilter,
    statusFilter,
    crStatusFilter,
    debouncedSearchQuery
  );

  /** Nearest-first for upcoming / all / week; most-recent past first for “Passées”. */
  const sortedFilteredSessions = useMemo(() => {
    const list = [...filteredSessions];
    const byTime = (a: Session, b: Session) => new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sessionFilter === 'past') {
      list.sort((a, b) => -byTime(a, b));
    } else {
      list.sort(byTime);
    }
    return list;
  }, [filteredSessions, sessionFilter]);

  const isLoading = isWebDesktop
    ? pagedQuery.isPending && !pagedQuery.data
    : infiniteQuery.isPending && !infiniteQuery.data;

  const isRefreshing = isWebDesktop
    ? pagedQuery.isFetching && !pagedQuery.isPending
    : infiniteQuery.isFetching && !infiniteQuery.isPending;

  const error = pagedQuery.error ?? infiniteQuery.error;

  const refetchSessions = () => {
    if (isWebDesktop) {
      return pagedQuery.refetch();
    }
    return queryClient.resetQueries({
      queryKey: ['sessions', 'list', 'infinite', apiFilter, LIST_PAGE_SIZE],
    });
  };

  const totalItems = pagedQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / LIST_PAGE_SIZE) || 1);
  const pageStart = totalItems === 0 ? 0 : (desktopPage - 1) * LIST_PAGE_SIZE + 1;
  const pageEnd = Math.min(desktopPage * LIST_PAGE_SIZE, totalItems);
  const desktopPageNums = useMemo(
    () => desktopVisiblePages(desktopPage, totalPages),
    [desktopPage, totalPages],
  );

  React.useEffect(() => {
    if (!isWebDesktop || pagedQuery.data == null) return;
    const tp = Math.max(1, Math.ceil(pagedQuery.data.total / LIST_PAGE_SIZE) || 1);
    if (desktopPage > tp) setDesktopPage(tp);
  }, [isWebDesktop, pagedQuery.data, desktopPage]);

  const showFullScreenLoading = isLoading;

  const handleSessionPress = (id: string) => {
    triggerLight();
    queryClient.prefetchQuery({ queryKey: ['session', id] });
    queryClient.prefetchQuery({
      queryKey: ['session', id, 'participants'],
      queryFn: () => fetchSessionParticipants(id),
    });
    queryClient.prefetchQuery({
      queryKey: ['subjects', 'catalog'],
      queryFn: fetchSubjectsCatalog,
    });
    router.push(`/(tabs)/sessions/${id}` as never);
  };

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  if (showFullScreenLoading) {
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
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
            <Text style={{ textAlign: 'center', color: colors.text, fontSize: 15 }}>
              Impossible de charger les séances. Réessayez plus tard.
            </Text>
            <Pressable
              onPress={() => {
                void refetchSessions();
              }}
              style={({ pressed }) => ({
                marginTop: 16,
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: colors.tint,
                opacity: pressed ? 0.8 : 1,
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              })}
              accessibilityLabel="Réessayer"
              accessibilityRole="button"
            >
              <Text style={{ fontWeight: '600', color: isDark ? colors.text : colors.background }}>Réessayer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm + 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Search + Refresh + Filtres — bouton filtre compact (44×44) pour petits écrans (évite coupure overflow:hidden) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                style={{
                  height: 44,
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: spacing.sm + 6,
                  fontSize: 14,
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                }}
                placeholder="Rechercher date, lieu ou salle…"
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable
              onPress={() => {
                void refetchSessions();
              }}
              disabled={isRefreshing}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: borderRadius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed || isRefreshing ? 0.7 : 1,
              })}
              accessibilityLabel="Actualiser la liste"
              accessibilityRole="button"
              accessibilityState={{ busy: isRefreshing }}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <MaterialCommunityIcons name="refresh" size={22} color={colors.tint} />
              )}
            </Pressable>
            <Pressable
              onPress={() => setFiltersModalVisible(true)}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: borderRadius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.backgroundSecondary,
                borderWidth: activeFiltersCount > 0 ? 2 : 1,
                borderColor: activeFiltersCount > 0 ? colors.tint : colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
              accessibilityLabel={
                activeFiltersCount > 0
                  ? `Filtres avancés, ${activeFiltersCount} actif${activeFiltersCount > 1 ? 's' : ''}`
                  : 'Filtres avancés (statut, période, CR)'
              }
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="filter-variant" size={22} color={colors.tint} />
              {activeFiltersCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 4,
                    backgroundColor: colors.tint,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.background,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{activeFiltersCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <View
            style={{
              marginHorizontal: -CONTENT_PADDING_HORIZONTAL,
              paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 2,
                paddingRight: spacing.md,
              }}
            >
              {FILTERS.map((f, index) => {
                const isActive = sessionFilter === f.value;
                return (
                  <Pressable
                    key={f.value}
                    onPress={() => setSessionFilter(f.value)}
                    style={{
                      marginRight: index < FILTERS.length - 1 ? spacing.sm : 0,
                      borderRadius: borderRadius.full,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: 11,
                      minHeight: MIN_TOUCH_TARGET_HEIGHT,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isActive ? colors.tint : colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: isActive ? colors.tint : colors.border,
                      shadowColor: isActive ? colors.tint : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.2 : 0,
                      shadowRadius: 3,
                      elevation: isActive ? 2 : 0,
                    }}
                    accessibilityLabel={`Filtre : ${f.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: getFilterChipTextColor(isActive, isDark, colors),
                        letterSpacing: 0.15,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => router.push('/(tabs)/sessions/attendance-history' as never)}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                marginTop: spacing.sm + 4,
                borderRadius: borderRadius.full,
                paddingHorizontal: spacing.lg,
                paddingVertical: 11,
                minHeight: MIN_TOUCH_TARGET_HEIGHT,
                backgroundColor: colors.tint + '18',
                borderWidth: 2,
                borderColor: colors.tint,
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: pressed ? 0.12 : 0.2,
                shadowRadius: 4,
                elevation: pressed ? 1 : 3,
                opacity: pressed ? 0.92 : 1,
              })}
              accessibilityLabel="Historique présence"
              accessibilityRole="button"
              accessibilityHint="Ouvre l’historique des présences aux séances"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={18}
                color={colors.tint}
                style={{ marginRight: spacing.sm }}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: colors.tint,
                  letterSpacing: 0.15,
                }}
                numberOfLines={1}
              >
                Historique présence
              </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={sortedFilteredSessions}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
              paddingTop: spacing.md,
              paddingBottom: scrollBottom,
              flexGrow: 1,
            }}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            ItemSeparatorComponent={SessionListSeparator}
            onEndReached={() => {
              if (isWebDesktop) return;
              if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return;
              void infiniteQuery.fetchNextPage();
            }}
            onEndReachedThreshold={0.35}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  void refetchSessions();
                }}
                tintColor={colors.tint}
              />
            }
            renderItem={({ item }) => (
              <SessionCard
                item={item}
                onPress={() => handleSessionPress(item.id)}
                colors={colors}
                isDark={isDark}
              />
            )}
            ListFooterComponent={
              isWebDesktop ? null : (
                <View style={{ paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
                  {infiniteQuery.isFetchingNextPage ? (
                    <ActivityIndicator color={colors.tint} />
                  ) : null}
                  {infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage ? (
                    <Pressable
                      onPress={() => {
                        void infiniteQuery.fetchNextPage();
                      }}
                      style={({ pressed }) => ({
                        borderRadius: borderRadius.full,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: 12,
                        minHeight: MIN_TOUCH_TARGET_HEIGHT,
                        backgroundColor: colors.tint + '18',
                        borderWidth: 2,
                        borderColor: colors.tint,
                        opacity: pressed ? 0.88 : 1,
                      })}
                      accessibilityLabel="Charger plus de séances"
                      accessibilityRole="button"
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.tint }}>Voir plus</Text>
                    </Pressable>
                  ) : null}
                </View>
              )
            }
            ListEmptyComponent={
              <EmptyState
                icon="calendar-blank"
                title="Aucune séance"
                message={
                  hasActiveFilters
                    ? 'Aucune séance trouvée'
                    : 'Vous n\'avez pas encore de séances programmées.'
                }
                actionLabel={hasActiveFilters ? 'Réinitialiser les filtres' : undefined}
                onAction={
                  hasActiveFilters
                    ? () => {
                      setSearchQuery('');
                      resetFilters();
                    }
                    : undefined
                }
              />
            }
          />
          {isWebDesktop && totalItems > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
                paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={2}>
                Affichage{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>{pageStart}-{pageEnd}</Text> sur{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>{totalItems}</Text> séances
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pressable
                  onPress={() => setDesktopPage((p) => Math.max(1, p - 1))}
                  disabled={desktopPage <= 1}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: desktopPage <= 1 ? 0.4 : pressed ? 0.75 : 1,
                  })}
                  accessibilityLabel="Page précédente"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="chevron-left" size={22} color={colors.tint} />
                </Pressable>
                {desktopPageNums.map((n) => {
                  const active = n === desktopPage;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setDesktopPage(n)}
                      style={{
                        minWidth: 36,
                        height: 36,
                        paddingHorizontal: 8,
                        borderRadius: borderRadius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? colors.tint : colors.backgroundSecondary,
                        borderWidth: 1,
                        borderColor: active ? colors.tint : colors.border,
                      }}
                      accessibilityLabel={`Page ${n}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: active ? (isDark ? colors.text : colors.background) : colors.text,
                        }}
                      >
                        {n}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setDesktopPage((p) => Math.min(totalPages, p + 1))}
                  disabled={desktopPage >= totalPages}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: desktopPage >= totalPages ? 0.4 : pressed ? 0.75 : 1,
                  })}
                  accessibilityLabel="Page suivante"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.tint} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
        <SessionFilterModal
          visible={filtersModalVisible}
          onClose={() => setFiltersModalVisible(false)}
          onApply={(f) => {
            setSessionFilter(f.datePeriod);
            setStatusFilter(f.status);
            setCrStatusFilter(f.crStatus);
          }}
          currentFilters={{
            status: statusFilter,
            datePeriod: sessionFilter,
            crStatus: crStatusFilter,
          }}
        />
      </View>
    </View>
  );
}
