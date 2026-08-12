import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { notificationsApi, type PaginatedNotifications } from '@/services/notifications';

const DEFAULT_PAGE_SIZE = 25;

/**
 * Liste paginée infinie (scroll) — aligné mobile `useInfiniteNotificationsList`.
 */
export function useInfiniteNotificationsList(
  enabled: boolean,
  options: { pageSize?: number; unreadOnly?: boolean } = {},
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const unreadOnly = options.unreadOnly ?? false;
  const fullyEnabled = enabled && isAuthenticated;

  return useInfiniteQuery<PaginatedNotifications>({
    queryKey: ['notifications', 'infinite', { pageSize, unreadOnly }],
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam as number, pageSize, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const shown = last.page * last.pageSize;
      return shown < last.total ? last.page + 1 : undefined;
    },
    enabled: fullyEnabled,
    staleTime: 10_000,
  });
}
