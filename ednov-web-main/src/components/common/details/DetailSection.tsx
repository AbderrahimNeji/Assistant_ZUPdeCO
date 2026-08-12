import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailSectionProps {
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlighted';
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  icon: Icon,
  iconColor,
  iconBgColor,
  title,
  children,
  className,
  variant = 'default',
}) => {
  return (
    <div
      className={cn(
        'detail-section',
        variant === 'highlighted' && 'detail-section-highlighted',
        className,
      )}
    >
      {(Icon || title) && (
        <div className="detail-section-header">
          {Icon && (
            <div
              className="detail-section-icon"
              style={{
                backgroundColor:
                  iconBgColor || 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
              }}
            >
              <Icon className="w-5 h-5" style={{ color: iconColor || 'var(--color-2-nuance-1)' }} />
            </div>
          )}
          {title && <h4 className="detail-section-title">{title}</h4>}
        </div>
      )}
      <div className="detail-section-content">{children}</div>
    </div>
  );
};
