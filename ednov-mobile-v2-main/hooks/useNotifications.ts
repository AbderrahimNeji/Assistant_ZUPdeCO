import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuth } from '@/providers/AuthProvider';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type PaginatedNotifications,
} from '@/services/notifications';
import { env } from '@/config/env';
import { auth } from '@/lib/firebase';
import { getApiV1BaseUrlFromEnv } from '@/lib/apiBaseUrl';

const UNREAD_REFRESH_MS = 30_000;
const RETRY_BASE_MS = 2_000;
const RETRY_CAP_MS = 30_000;
const NO_USER_RETRY_MS = 5_000;
const TOKEN_REFRESH_MS = 50 * 60 * 1_000;

/**
 * Unread notifications count with periodic refresh + app-foreground refetch.
 *
 * On web (react-native-web), this additionally opens an SSE stream to the backend
 * for instant updates. On native, we rely on polling for now; to add push-like
 * realtime on native, install `react-native-sse` and wire it here similarly.
 */
export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user && !!env.apiUrl;

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: enabled ? UNREAD_REFRESH_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled, queryClient]);

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== 'web') return;
    if (typeof EventSource === 'undefined') return;

    let es: EventSource | null = null;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = RETRY_BASE_MS;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };

    const connect = async () => {
      if (disposed) return;
      clearTimer();

      const current = auth.currentUser;
      if (!current) {
        timer = setTimeout(connect, NO_USER_RETRY_MS);
        return;
      }

      let token: string;
      try {
        token = await current.getIdToken();
      } catch (err) {
        console.warn('[notifications-stream] getIdToken failed', err);
        timer = setTimeout(connect, NO_USER_RETRY_MS);
        return;
      }

      const base = getApiV1BaseUrlFromEnv(env.apiUrl);
      if (!base) {
        console.warn('[notifications-stream] EXPO_PUBLIC_API_URL is empty; cannot open SSE');
        return;
      }

      es?.close();
      es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(token)}`);

      es.addEventListener('notification.created', invalidate);
      es.addEventListener('notification.read', invalidate);
      es.addEventListener('notification.read_all', invalidate);

      es.onopen = () => {
        retryDelay = RETRY_BASE_MS;
        clearTimer();
        timer = setTimeout(connect, TOKEN_REFRESH_MS);
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (disposed) return;
        clearTimer();
        timer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RETRY_CAP_MS);
      };
    };

    void connect();

    return () => {
      disposed = true;
      clearTimer();
      es?.close();
      es = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/** Paginated list of notifications (first page). Enabled when the bell dropdown is open. */
export function useNotificationsList(enabled: boolean, pageSize = 15) {
  const { user } = useAuth();
  const fullyEnabled = enabled && !!user && !!env.apiUrl;
  return useQuery<PaginatedNotifications>({
    queryKey: ['notifications', { page: 1, pageSize }],
    queryFn: () => fetchNotifications(1, pageSize),
    enabled: fullyEnabled,
    staleTime: 10_000,
  });
}

/**
 * Infinite notifications list (paginated by page). Pair with FlatList's onEndReached
 * to load the next page as the user scrolls. Only enabled when the dropdown is open.
 */
export function useInfiniteNotificationsList(
  enabled: boolean,
  options: { pageSize?: number; unreadOnly?: boolean } = {},
) {
  const { user } = useAuth();
  const pageSize = options.pageSize ?? 15;
  const unreadOnly = options.unreadOnly ?? false;
  const fullyEnabled = enabled && !!user && !!env.apiUrl;
  return useInfiniteQuery<PaginatedNotifications>({
    queryKey: ['notifications', 'infinite', { pageSize, unreadOnly }],
    queryFn: ({ pageParam }) =>
      fetchNotifications(pageParam as number, pageSize, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const shown = last.page * last.pageSize;
      return shown < last.total ? last.page + 1 : undefined;
    },
    enabled: fullyEnabled,
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}
