import * as React from 'react';
import { cn } from '@/lib/utils';
import { getNotificationBadgeDisplay } from '@/utils/formatNotificationCount';

type Props = Readonly<{
  count: number;
  className?: string;
  plusClassName?: string;
}>;

/** Compte badge : chiffre normal, « + » plus grand à partir de 10 notifications. */
export const NotificationBadgeCount: React.FC<Props> = ({ count, className, plusClassName }) => {
  const display = getNotificationBadgeDisplay(count);
  if (display.kind === 'exact') {
    return <span className={className}>{display.text}</span>;
  }
  return (
    <span className={cn('notification-badge-count', className)}>
      9<span className={cn('notification-badge-plus', plusClassName)}>+</span>
    </span>
  );
};
