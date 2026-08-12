import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
  useInfiniteNotificationsList,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotificationsCount,
} from '@/hooks/useNotifications';
import { useDynamicColors } from '@/providers/BrandingProvider';
import type { AppNotification } from '@/services/notifications';
import { NotificationBadgeCount } from '@/components/NotificationBadgeCount';
import { formatNotificationBadgeCount } from '@/utils/formatNotificationCount';

const BADGE_COLOR = '#EF4444';

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString('fr-FR');
}

function resolveDeepLink(n: AppNotification): string | null {
  const payload = n.payload ?? {};
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : null;
  const reportId = typeof payload.reportId === 'string' ? payload.reportId : null;
  if (sessionId && reportId) {
    return `/comptes-rendus/${reportId}`;
  }
  if (sessionId) return `/sessions/${sessionId}` as const;
  return null;
}

type Props = Readonly<{
  /** Icon button size in px. Defaults to 40. */
  size?: number;
  /** Icon color. Defaults to branding `text`. */
  color?: string;
}>;

/**
 * Bell button + bottom-sheet style modal listing in-app notifications.
 * Place anywhere in the mobile header. Driven by React Query; realtime on web via SSE,
 * polling fallback on native (30 s).
 */
export function NotificationsBell({ size = 40, color }: Props) {
  const colors = useDynamicColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { count } = useUnreadNotificationsCount();
  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteNotificationsList(open, { unreadOnly });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = useMemo(() => {
    const pages = data?.pages;
    if (!pages?.length) return [] as AppNotification[];
    const seen = new Set<string>();
    const out: AppNotification[] = [];
    for (const p of pages) {
      for (const n of p.items) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        out.push(n);
      }
    }
    return out;
  }, [data]);
  const total = data?.pages?.[0]?.total ?? 0;
  const tintColor = color ?? colors.text;
  const iconSize = Math.round(size * 0.55);

  const handlePress = useCallback(
    (n: AppNotification) => {
      if (!n.readAt) markRead.mutate(n.id);
      const link = resolveDeepLink(n);
      if (link) {
        setOpen(false);
        // expo-router typed routes: route strings are dynamically resolved here.
        router.push(link as never);
      }
    },
    [markRead, router],
  );

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    void refetch();
  }, [queryClient, refetch]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setUnreadOnly(false);
  }, []);

  return (
    <>
      <Pressable
        accessibilityLabel={
          count > 0 ? `Notifications (${count} non lues)` : 'Notifications'
        }
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: pressed
              ? colors.tint + '18'
              : 'transparent',
          },
        ]}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={iconSize}
          color={tintColor}
        />
        {count > 0 && (
          <View
            style={[
              styles.badge,
              count >= 10 && styles.badgeCapped,
              {
                backgroundColor: BADGE_COLOR,
                borderColor: colors.background,
              },
            ]}
            pointerEvents="none"
          >
            <NotificationBadgeCount count={count} style={styles.badgeText} plusStyle={styles.badgePlus} />
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Notifications
              </Text>
              {unreadOnly && total > 0 ? (
                <View style={[styles.totalBadge, { backgroundColor: colors.tint + '18' }]}>
                  <NotificationBadgeCount
                    count={total}
                    style={[styles.totalBadgeText, { color: colors.tint }]}
                    plusStyle={[styles.badgePlus, { color: colors.tint }]}
                  />
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => markAllRead.mutate()}
              disabled={count === 0 || markAllRead.isPending}
              style={({ pressed }) => [
                styles.markAllButton,
                {
                  opacity: count === 0 || markAllRead.isPending ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
              accessibilityLabel="Tout marquer comme lu"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="check-all"
                size={16}
                color={colors.tint}
              />
              <Text style={[styles.markAllText, { color: colors.tint }]}>
                Tout marquer comme lu
              </Text>
            </Pressable>
          </View>

          <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
            {([
              { id: 'all', label: 'Toutes', active: !unreadOnly },
              {
                id: 'unread',
                label: `Non lues${count > 0 ? ` (${formatNotificationBadgeCount(count)})` : ''}`,
                active: unreadOnly,
              },
            ] as const).map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setUnreadOnly(f.id === 'unread')}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: f.active ? colors.tint : colors.backgroundSecondary,
                    borderColor: f.active ? colors.tint : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: f.active }}
                accessibilityLabel={`Filtre : ${f.label}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: f.active ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {isLoading && items.length === 0 ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.tint} />
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Chargement…
              </Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBlock}>
              <MaterialCommunityIcons
                name="bell-off-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {unreadOnly ? 'Aucune notification non lue' : 'Aucune notification'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews={Platform.OS !== 'web'}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.35}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching && !isFetchingNextPage}
                  onRefresh={handleRefresh}
                  tintColor={colors.tint}
                />
              }
              renderItem={({ item }) => {
                const unread = !item.readAt;
                return (
                  <Pressable
                    onPress={() => handlePress(item)}
                    style={({ pressed }) => [
                      styles.item,
                      {
                        backgroundColor: pressed
                          ? colors.tint + '10'
                          : unread
                            ? colors.tint + '08'
                            : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      unread ? `Non lu : ${item.title}` : item.title
                    }
                  >
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: unread ? BADGE_COLOR : 'transparent',
                        },
                      ]}
                    />
                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: colors.text,
                            fontWeight: unread ? '700' : '500',
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.body ? (
                        <Text
                          style={[styles.itemBody, { color: colors.textSecondary }]}
                          numberOfLines={3}
                        >
                          {item.body}
                        </Text>
                      ) : null}
                      <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                        {formatRelative(item.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footer}>
                    <ActivityIndicator color={colors.tint} />
                  </View>
                ) : !hasNextPage && items.length >= 15 ? (
                  <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                      Fin de la liste · {items.length} notification{items.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeCapped: {
    minWidth: 22,
    paddingHorizontal: 3,
  },
  badgePlus: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalBadge: {
    minWidth: 24,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    fontSize: 13,
  },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  loadingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
  },
  list: {
    paddingVertical: 4,
  },
  listContent: {
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  itemTime: {
    marginTop: 4,
    fontSize: 11,
    opacity: 0.8,
  },
});
