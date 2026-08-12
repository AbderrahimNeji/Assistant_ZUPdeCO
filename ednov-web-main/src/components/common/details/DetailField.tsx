import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  vertical?: boolean;
}

export const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  icon: Icon,
  className,
  vertical = false,
}) => {
  return (
    <div className={cn('detail-field', vertical && 'detail-field-vertical', className)}>
      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      <span className="detail-field-label">{label}</span>
      <span className="detail-field-value">{value}</span>
    </div>
  );
};
