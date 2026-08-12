import * as React from 'react';

interface NotificationsSkeletonProps {
  rows?: number;
}

export const NotificationsSkeleton: React.FC<NotificationsSkeletonProps> = ({ rows = 3 }) => {
  return (
    <div className="notifications-dropdown-skeleton-list" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="notifications-dropdown-skeleton-row">
          <div className="notifications-dropdown-skeleton-avatar animate-shimmer" />
          <div className="notifications-dropdown-skeleton-lines">
            <div className="notifications-dropdown-skeleton-line animate-shimmer w-3/4" />
            <div className="notifications-dropdown-skeleton-line animate-shimmer w-5/6" />
            <div className="notifications-dropdown-skeleton-line animate-shimmer w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};
