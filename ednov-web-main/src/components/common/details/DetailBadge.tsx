import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailBadgeProps {
  label: string;
  icon: LucideIcon;
  colorName: 'color-2' | 'color-1' | 'color-3' | 'success' | 'error' | 'male' | 'female';
  variant: 'filled' | 'outlined';
  className?: string;
}

export const DetailBadge: React.FC<DetailBadgeProps> = ({
  label,
  icon: Icon,
  colorName,
  variant,
  className,
}) => {
  const badgeClass = cn('detail-badge', `detail-badge-${variant}-${colorName}`, className);

  return (
    <div className={badgeClass}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};
