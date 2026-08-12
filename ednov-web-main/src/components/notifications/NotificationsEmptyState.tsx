import * as React from 'react';
import { BellOff } from 'lucide-react';

interface NotificationsEmptyStateProps {
  title?: string;
  subtitle?: string;
}

export const NotificationsEmptyState: React.FC<NotificationsEmptyStateProps> = ({
  title = 'Aucune notification',
  subtitle = 'Vous êtes à jour. Les nouvelles notifications apparaîtront ici.',
}) => {
  return (
    <div className="notifications-dropdown-empty">
      <div className="notifications-dropdown-empty-icon">
        <BellOff className="h-6 w-6" />
      </div>
      <div className="notifications-dropdown-empty-title">{title}</div>
      <div className="notifications-dropdown-empty-subtitle">{subtitle}</div>
    </div>
  );
};
