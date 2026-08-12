import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon?: LucideIcon;
  title?: string;
  children: React.ReactNode;
  colorName?: 'color-2' | 'color-1' | 'color-3';
  className?: string;
  variant?: 'default' | 'subtle';
  colSpan?: 1 | 2 | 3 | 'full';
}

const colorConfig = {
  'color-2': {
    iconBg: 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)]',
    iconColor: 'text-[var(--color-2-nuance-1)]',
    titleColor: 'text-[var(--color-2-nuance-1)]',
  },
  'color-1': {
    iconBg: 'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)]',
    iconColor: 'text-[var(--color-1-nuance-1)]',
    titleColor: 'text-[var(--color-1-nuance-1)]',
  },
  'color-3': {
    iconBg: 'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)]',
    iconColor: 'text-[var(--color-3-nuance-1)]',
    titleColor: 'text-[var(--color-3-nuance-1)]',
  },
};

export const SectionCard: React.FC<SectionCardProps> = ({
  icon: Icon,
  title,
  children,
  colorName = 'color-2',
  className,
  variant = 'default',
  colSpan,
}) => {
  const colors = colorConfig[colorName];

  const getColSpanClass = () => {
    if (!colSpan) return '';
    if (colSpan === 'full') return 'section-card-full';
    if (colSpan === 1) return 'section-card-compact';
    return `md:col-span-${colSpan}`;
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 transition-all',
        variant === 'default' && [
          'bg-[var(--card)]',
          'border border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]',
          'hover:border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
        ],
        variant === 'subtle' && [
          'bg-[color-mix(in_srgb,var(--card)_50%,transparent)]',
          'border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]',
        ],
        getColSpanClass(),
        className,
      )}
    >
      {(Icon || title) && (
        <div className="flex items-center gap-3 mb-4">
          {Icon && (
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                colors.iconBg,
              )}
            >
              <Icon className={cn('w-5 h-5', colors.iconColor)} />
            </div>
          )}
          {title && <h4 className={cn('text-base font-semibold', colors.titleColor)}>{title}</h4>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
};
