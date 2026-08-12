import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
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

import { CrFilterModal } from '@/components/CrFilterModal';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PendingSyncBadge } from '@/components/PendingSyncBadge';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, CARD_PADDING_HORIZONTAL, CONTENT_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { getFabBottomOffset, MIN_TOUCH_TARGET_HEIGHT } from '@/constants/Layout';
import { useIsWebDesktop } from '@/hooks/useWebDesktop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCrFilterStore } from '@/store/crFilterStore';
import { useOfflineQueueStore, type CrSubmitPayload } from '@/store/offlineQueueStore';
import { useComptesRendus } from '@/hooks/useComptesRendus';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { getReportDisplayRating } from '@/utils/report-author-feedback';
import { fetchSessionParticipants } from '@/services/sessions';
import { fetchSubjectsCatalog } from '@/services/subjects';
import type { CompteRendu } from '@/types/compteRendu';
import { isSubmitted, isValidated } from '@/types/compteRendu';
import type { Session } from '@/types/session';
import type { CrDatePeriod, CrReportStatusFilter } from '@/store/crFilterStore';
import { getCrDateRange } from '@/utils/crFilters';

const CR_DETAIL_ICON_SIZE = 36;

const CR_STATUS_FILTERS: { value: CrReportStatusFilter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'a-saisir', label: 'CR à saisir' },
  { value: 'saisi', label: 'Saisi' },
  { value: 'valide', label: 'Validé' },
];

function getCrChipTextColor(isActive: boolean, isDark: boolean, colors: ColorPalette): string {
  if (isActive) return isDark ? colors.text : colors.background;
  return colors.text;
}

/** Session + CR list data and filtered list for the CR list screen. */
function useCrListData(
  sessions: unknown,
  crList: CompteRendu[] | undefined,
  datePeriod: CrDatePeriod,
  reportStatus: CrReportStatusFilter,
  searchQuery: string
) {
  const sessionMap = useMemo(() => {
    const list: Session[] = Array.isArray(sessions) ? sessions : [];
    const m = new Map<string, string>();
    list.forEach((s) => {
      try {
        const label = new Date(s.date).toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        m.set(s.id, `${label} · ${s.establishment ?? '—'}`);
      } catch {
        m.set(s.id, `Séance ${s.id}`);
      }
    });
    return m;
  }, [sessions]);

  const sessionDateMap = useMemo(() => {
    const list: Session[] = Array.isArray(sessions) ? sessions : [];
    const m = new Map<string, number>();
    list.forEach((s) => {
      m.set(s.id, new Date(s.date).getTime());
    });
    return m;
  }, [sessions]);

  const { startMs, endMs } = useMemo(() => getCrDateRange(datePeriod), [datePeriod]);

  const filteredList = useMemo(() => {
    let list = crList ?? [];
    if (reportStatus === 'a-saisir') list = list.filter((cr) => !isSubmitted(cr));
    else if (reportStatus === 'saisi') list = list.filter((cr) => isSubmitted(cr) && !isValidated(cr));
    else if (reportStatus === 'valide') list = list.filter(isValidated);
    list = list.filter((cr) => {
      const dateMs =
        sessionDateMap.get(cr.sessionId) ??
        (cr.sessionDate ? new Date(cr.sessionDate).getTime() : null) ??
        (cr.submittedAt ? new Date(cr.submittedAt).getTime() : 0);
      return dateMs >= startMs && dateMs <= endMs;
    });
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((cr) => {
        const label = (
          sessionMap.get(cr.sessionId) ??
          formatSessionDateLabel(cr.sessionDate) ??
          ''
        ).toLowerCase();
        return label.includes(q);
      });
    }
    return list;
  }, [crList, reportStatus, datePeriod, startMs, endMs, sessionMap, sessionDateMap, searchQuery]);

  const activeFiltersCount =
    (datePeriod === 'week' || datePeriod === 'month' ? 1 : 0) +
    (reportStatus === 'a-saisir' || reportStatus === 'saisi' || reportStatus === 'valide' ? 1 : 0);
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    datePeriod === 'week' ||
    datePeriod === 'month' ||
    reportStatus === 'a-saisir' ||
    reportStatus === 'saisi' ||
    reportStatus === 'valide';

  return { sessionMap, sessionDateMap, filteredList, activeFiltersCount, hasActiveFilters };
}

/** Format a session date ISO string to a short readable label (e.g. "lun. 24 mars 2026"). Returns null if unparseable. */
function formatSessionDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatCrDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function CrListSeparator() {
  return <View style={{ height: spacing.sm }} />;
}

function getCrStatusDisplayColor(submitted: boolean, colors: ColorPalette): string {
  return submitted ? colors.success : colors.warning;
}

function ReportCardRow({
  item,
  sessionLabel,
  onPress,
  colors,
  isDark,
  isPendingSync,
}: Readonly<{
  item: CompteRendu;
  sessionLabel: string;
  onPress: () => void;
  colors: ColorPalette;
  isDark: boolean;
  isPendingSync?: boolean;
}>) {
  const submitted = isSubmitted(item);
  const validated = isValidated(item);
  const statusColor = getCrStatusDisplayColor(submitted, colors);
  const statusLabel = validated ? 'Validé' : submitted ? 'Saisi' : 'À saisir';
  const meanRating = getReportDisplayRating(item);
  const noteLabel = meanRating != null ? `${meanRating}/5` : null;
  const preview = [item.matiere, noteLabel].filter(Boolean).join(' · ') || '—';

  return (
    <Pressable
      testID={`cr-list-item-${item.id}`}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      accessibilityLabel={`${sessionLabel}, ${statusLabel}, ${preview}`}
      accessibilityRole="button"
      accessibilityHint={submitted ? 'Affiche le détail du compte rendu' : 'Ouvre le formulaire pour remplir le CR'}
    >
      <View
        style={{
          minHeight: 72,
          borderRadius: borderRadius.xl,
          backgroundColor: colors.background,
          paddingVertical: spacing.md,
          paddingHorizontal: CARD_PADDING_HORIZONTAL,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'nowrap',
          overflow: 'hidden' as const,
          ...getCardShadowPlatform(isDark),
        }}
      >
      {/* Left: status + Date de séance + Aperçu (like web) */}
        <View style={{ flex: 1, minWidth: 0, paddingLeft: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 10,
              backgroundColor: statusColor + '18',
              borderWidth: 1,
              borderColor: statusColor,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
          </View>
          {isPendingSync ? <PendingSyncBadge /> : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <View
            style={{
              width: CR_DETAIL_ICON_SIZE,
              height: CR_DETAIL_ICON_SIZE,
              borderRadius: CR_DETAIL_ICON_SIZE / 2,
              backgroundColor: colors.info + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="calendar" size={18} color={colors.info} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Date de séance</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {sessionLabel}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: CR_DETAIL_ICON_SIZE,
              height: CR_DETAIL_ICON_SIZE,
              borderRadius: CR_DETAIL_ICON_SIZE / 2,
              backgroundColor: colors.tint + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.tint} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>Aperçu</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {preview}
            </Text>
          </View>
          {submitted && item.submittedAt ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, flexShrink: 0 }}>{formatCrDate(item.submittedAt)}</Text>
          ) : null}
        </View>
      </View>

      {/* Chevron on far right of card */}
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
      </View>
    </Pressable>
  );
}

/** Convert a queued cr_submit item to a local-only CompteRendu for display. */
function queueItemToCr(queueId: string, payload: CrSubmitPayload): CompteRendu {
  const authorFeedbacks = payload.authorFeedbacks;
  const first = authorFeedbacks?.[0];
  return {
    id: queueId,
    sessionId: payload.sessionId,
    authorFeedbacks,
    note: first?.rating != null ? String(first.rating) : payload.note ?? null,
    matiereIds: payload.matiereIds,
    commentaire: first?.comment ?? payload.commentaire ?? null,
    feeling: first?.feeling ?? payload.feeling ?? null,
    status: 'draft',
    submittedAt: null,
  };
}

export default function ComptesRendusListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const isWebDesktop = useIsWebDesktop();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const { datePeriod, reportStatus, setDatePeriod, setReportStatus, resetFilters } = useCrFilterStore();
  const { data: crList, isLoading, isRefetching, error, refetch } = useComptesRendus();
  const { data: sessions } = useSessions();
  const { data: profile } = useProfile();
  const offlineQueue = useOfflineQueueStore((s) => s.queue);

  // Pending session IDs — used to show PendingSyncBadge on server-side CRs being updated
  const pendingSessionIds = useMemo(() => {
    const ids = new Set<string>();
    offlineQueue.forEach((item) => {
      if (item.type === 'cr_submit' || item.type === 'cr_update') {
        ids.add((item.payload as { sessionId: string }).sessionId);
      }
    });
    return ids;
  }, [offlineQueue]);

  // Local-only CRs from the queue (cr_submit items with no matching server CR)
  const localOnlyCrs = useMemo(() => {
    const serverSessionIds = new Set(crList?.map((cr) => cr.sessionId) ?? []);
    return offlineQueue
      .filter((item) => item.type === 'cr_submit' && !serverSessionIds.has((item.payload as CrSubmitPayload).sessionId))
      .map((item) => queueItemToCr(item.id, item.payload as CrSubmitPayload));
  }, [offlineQueue, crList]);

  const mergedCrList = useMemo(
    () => (localOnlyCrs.length > 0 ? [...localOnlyCrs, ...(crList ?? [])] : crList),
    [localOnlyCrs, crList]
  );

  const { sessionMap, filteredList, activeFiltersCount, hasActiveFilters } = useCrListData(
    sessions,
    mergedCrList,
    datePeriod,
    reportStatus,
    debouncedSearchQuery
  );

  const showFullScreenLoading = isLoading && crList === undefined;

  const handleCrPress = (item: CompteRendu) => {
    const isLocalOnly = item.id.startsWith('offline-');
    // Warm up the cache so participants and subjects are available when the form
    // opens, even if the user goes offline between now and tapping the CR.
    if (item.sessionId) {
      queryClient.prefetchQuery({
        queryKey: ['session', item.sessionId, 'participants'],
        queryFn: () => fetchSessionParticipants(item.sessionId),
      });
      queryClient.prefetchQuery({
        queryKey: ['subjects', 'catalog'],
        queryFn: fetchSubjectsCatalog,
      });
    }
    if (isLocalOnly) {
      // Offline-pending CR: extract queue item id so the form can pre-fill and replace the draft
      const offlineQueueId = item.id.slice('offline-'.length);
      router.push(
        `/(tabs)/comptes-rendus/new?sessionId=${item.sessionId}&offlineQueueId=${offlineQueueId}` as never
      );
    } else if (isSubmitted(item)) {
      router.push(`/(tabs)/comptes-rendus/${item.id}?sessionId=${item.sessionId}` as never);
    } else {
      // Server-side draft: open in edit mode so we update rather than create a duplicate
      router.push(
        `/(tabs)/comptes-rendus/new?sessionId=${item.sessionId}&reportId=${item.id}` as never
      );
    }
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
          <ErrorMessage
            title="Erreur"
            message="Impossible de charger les comptes rendus. Réessayez plus tard."
            onRetry={() => refetch()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground, paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET }}>
      <View style={contentSheetStyle}>
        {/* Header — C1: search + Filtres */}
        <View
          style={{
            paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm + 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
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
                placeholder="Rechercher tuteur ou élève…"
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable
              onPress={() => refetch()}
              disabled={isRefetching}
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
                opacity: pressed || isRefetching ? 0.7 : 1,
              })}
              accessibilityLabel="Actualiser la liste"
              accessibilityRole="button"
              accessibilityState={{ busy: isRefetching }}
            >
              {isRefetching ? (
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
              accessibilityLabel={activeFiltersCount > 0 ? `Filtres (${activeFiltersCount} actif)` : 'Filtres avancés (période)'}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 2,
              paddingRight: spacing.md,
            }}
            style={{ marginHorizontal: -CONTENT_PADDING_HORIZONTAL, paddingHorizontal: CONTENT_PADDING_HORIZONTAL }}
          >
            {CR_STATUS_FILTERS.map((f, index) => {
              const isActive = reportStatus === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setReportStatus(f.value)}
                  style={{
                    marginRight: index < CR_STATUS_FILTERS.length - 1 ? spacing.sm : 0,
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
                  accessibilityLabel={`Filtre CR : ${f.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: getCrChipTextColor(isActive, isDark, colors),
                      letterSpacing: 0.15,
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          ref={listRef}
          data={filteredList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
            paddingTop: spacing.md,
            paddingBottom: getFabBottomOffset(insets, { webDesktop: isWebDesktop }) + spacing.lg,
          }}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          ItemSeparatorComponent={CrListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.tint}
            />
          }
          renderItem={({ item }) => (
            <ReportCardRow
              item={item}
              sessionLabel={sessionMap.get(item.sessionId) ?? formatSessionDateLabel(item.sessionDate) ?? '—'}
              onPress={() => handleCrPress(item)}
              colors={colors}
              isDark={isDark}
              isPendingSync={pendingSessionIds.has(item.sessionId)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title="Aucun compte rendu"
              message={hasActiveFilters ? 'Aucun compte rendu trouvé' : "Vous n'avez pas encore de comptes rendus."}
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
        <CrFilterModal
          visible={filtersModalVisible}
          onClose={() => setFiltersModalVisible(false)}
          onApply={(f) => {
            setDatePeriod(f.datePeriod);
            setReportStatus(f.reportStatus);
          }}
          currentFilters={{ datePeriod, reportStatus }}
        />
      </View>


    </View>
  );
}
