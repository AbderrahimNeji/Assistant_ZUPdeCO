import * as React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInfiniteNotificationsList } from '@/hooks/useInfiniteNotificationsList';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsStream } from '@/hooks/useNotificationsStream';
import { AppNotification, notificationsApi } from '@/services/notifications';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { resolveDeepLink } from '@/components/notifications/notificationUtils';
import { NotificationBadgeCount } from '@/components/notifications/NotificationBadgeCount';
export const NotificationsBell: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = React.useState(false);

  useNotificationsStream(isAuthenticated);

  const countQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const listQuery = useInfiniteNotificationsList(open);

  const invalidateNotifications = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidateNotifications,
  });

  const unreadCount = countQuery.data ?? 0;

  const items = React.useMemo(() => {
    const pages = listQuery.data?.pages;
    if (!pages?.length) return [] as AppNotification[];
    const seen = new Set<string>();
    const out: AppNotification[] = [];
    for (const page of pages) {
      for (const n of page.items) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        out.push(n);
      }
    }
    return out;
  }, [listQuery.data]);

  const total = listQuery.data?.pages?.[0]?.total ?? items.length;

  const handleLoadMore = React.useCallback(() => {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
    void listQuery.fetchNextPage();
  }, [listQuery]);

  const handleClick = (n: AppNotification) => {
    if (!n.readAt) markReadMutation.mutate(n.id);
    const to = resolveDeepLink(n);
    if (to) {
      navigate(to);
      setOpen(false);
    }
  };

  return (
    <>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="notifications-backdrop" aria-hidden onClick={() => setOpen(false)} />,
          document.body,
        )}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className="navbar-icon-button hidden sm:flex relative"
                  aria-label={
                    unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : 'Notifications'
                  }
                  type="button"
                >
                  <Bell />
                  {unreadCount > 0 && (
                    <span className="navbar-notification-badge-count" aria-hidden="true">
                      <NotificationBadgeCount count={unreadCount} />
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="notifications-dropdown-content w-[420px] max-w-[calc(100vw-1rem)] p-0 !origin-top-right border-0 shadow-none bg-transparent"
        >
          <NotificationsPanel
            items={items}
            total={total}
            unreadCount={unreadCount}
            isLoading={listQuery.isLoading}
            isFetchingMore={listQuery.isFetchingNextPage}
            hasMore={listQuery.hasNextPage ?? false}
            onLoadMore={handleLoadMore}
            isMarkingAllRead={markAllReadMutation.isPending}
            onItemClick={handleClick}
            onMarkAllRead={() => markAllReadMutation.mutate()}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
