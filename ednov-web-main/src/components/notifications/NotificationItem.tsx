import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/services/notifications';
import { formatRelative, getIconMeta } from './notificationUtils';

interface NotificationItemProps {
  notification: AppNotification;
  onClick?: (notification: AppNotification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const meta = getIconMeta(notification.type);
  const { Icon } = meta;
  const isUnread = !notification.readAt;

  return (
    <button
      type="button"
      onClick={() => onClick?.(notification)}
      className={cn('notifications-dropdown-item', isUnread ? 'is-unread' : 'is-read')}
    >
      <span className={cn('notifications-dropdown-item-icon', meta.bgClass)} aria-hidden>
        <Icon className={cn('h-4 w-4', meta.colorClass)} />
      </span>
      <div className="notifications-dropdown-item-content">
        <div className="notifications-dropdown-item-title">{notification.title}</div>
        {notification.body && (
          <div className="notifications-dropdown-item-body">{notification.body}</div>
        )}
        <div className="notifications-dropdown-item-time">
          {formatRelative(notification.createdAt)}
        </div>
      </div>
      {isUnread && <span className="notifications-dropdown-item-unread-dot" aria-hidden />}
    </button>
  );
};
