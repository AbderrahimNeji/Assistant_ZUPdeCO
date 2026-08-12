import * as React from 'react';
import { cn } from '@/lib/utils';

interface TableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  role?: string;
  tabIndex?: number;
  className?: string;
  ariaLabel?: string;
}

export const TableCard: React.FC<TableCardProps> = ({
  children,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  className,
  ariaLabel,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
    onKeyDown?.(e);
  };

  return (
    <div
      className={cn('table-card', className)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role || (onClick ? 'button' : undefined)}
      tabIndex={tabIndex !== undefined ? tabIndex : onClick ? 0 : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};
