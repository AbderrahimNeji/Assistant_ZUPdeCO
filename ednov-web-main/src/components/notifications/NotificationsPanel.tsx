import * as React from 'react';
import { CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/forms/Button';
import { ScrollBar } from '@/components/ui/scroll-bar';
import type { AppNotification } from '@/services/notifications';
import { NotificationItem } from './NotificationItem';
import { NotificationsEmptyState } from './NotificationsEmptyState';
import { NotificationsSkeleton } from './NotificationsSkeleton';
import { NotificationBadgeCount } from '@/components/notifications/NotificationBadgeCount';
import { BUCKET_LABELS, groupByBucket } from './notificationUtils';

interface NotificationsPanelProps {
  items: AppNotification[];
  /** Total côté API (toutes pages). */
  total?: number;
  unreadCount: number;
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isMarkingAllRead?: boolean;
  onItemClick?: (notification: AppNotification) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

const SCROLL_LOAD_THRESHOLD_PX = 80;

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  items,
  total,
  unreadCount,
  isLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  isMarkingAllRead = false,
  onItemClick,
  onMarkAllRead,
  className,
}) => {
  const groups = React.useMemo(() => groupByBucket(items), [items]);
  const hasItems = items.length > 0;
  const totalCount = total ?? items.length;

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || isFetchingMore || !onLoadMore) return;
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < SCROLL_LOAD_THRESHOLD_PX) {
        onLoadMore();
      }
    },
    [hasMore, isFetchingMore, onLoadMore],
  );

  return (
    <div className={cn('notifications-dropdown', className)}>
      <header className="notifications-dropdown-header">
        <div className="notifications-dropdown-header-left">
          <span className="notifications-dropdown-title">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 gap-1 px-2 text-[10px] tracking-wide">
              <NotificationBadgeCount count={unreadCount} />
              <span>non lue{unreadCount > 1 ? 's' : ''}</span>
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={CheckCheck}
          iconPosition="left"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0 || isMarkingAllRead}
          loading={isMarkingAllRead}
        >
          Tout marquer comme lu
        </Button>
      </header>

      <ScrollBar maxHeight="460px" className="notifications-dropdown-body" onScroll={handleScroll}>
        {isLoading ? (
          <NotificationsSkeleton />
        ) : !hasItems ? (
          <NotificationsEmptyState />
        ) : (
          <>
            {groups.map(([bucket, arr]) => (
              <section key={bucket} className="notifications-dropdown-group">
                <div className="notifications-dropdown-group-label">{BUCKET_LABELS[bucket]}</div>
                {arr.map((n) => (
                  <NotificationItem key={n.id} notification={n} onClick={onItemClick} />
                ))}
              </section>
            ))}
            {isFetchingMore ? (
              <div className="notifications-dropdown-loading-more" aria-live="polite">
                Chargement…
              </div>
            ) : null}
          </>
        )}
      </ScrollBar>

      {hasItems && (
        <footer className="notifications-dropdown-footer">
          <span className="notifications-dropdown-footer-count">
            {items.length < totalCount
              ? `${items.length} sur ${totalCount}`
              : `${totalCount} notification${totalCount > 1 ? 's' : ''}`}
          </span>
        </footer>
      )}
    </div>
  );
};
