import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailChip {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface DetailChipListProps {
  items: DetailChip[];
  colorScheme: 'color-2' | 'color-1' | 'color-3';
  variant?: 'filled' | 'outlined';
  className?: string;
}

export const DetailChipList: React.FC<DetailChipListProps> = ({
  items,
  colorScheme,
  variant = 'filled',
  className,
}) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun élément</p>;
  }

  return (
    <div className={cn('detail-chip-list', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <span
            key={item.id}
            className={cn(
              'detail-chip',
              variant === 'filled'
                ? `detail-chip-filled-${colorScheme}`
                : `detail-chip-outlined-${colorScheme}`,
            )}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {item.label}
          </span>
        );
      })}
    </div>
  );
};
