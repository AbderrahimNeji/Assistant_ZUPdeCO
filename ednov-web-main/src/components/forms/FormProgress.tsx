import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormProgressProps {
  totalFields: number;
  validFields: number;
  className?: string;
  showPercentage?: boolean;
  showLabel?: boolean;
}

export const FormProgress: React.FC<FormProgressProps> = ({
  totalFields,
  validFields,
  className,
  showPercentage = true,
  showLabel = true,
}) => {
  const percentage = totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0;

  return (
    <div className={cn('w-full space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {validFields}/{totalFields} champs remplis
          </span>
          {showPercentage && (
            <span className="font-medium text-[var(--color-2-nuance-1)]">{percentage}%</span>
          )}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            percentage < 33 && 'bg-destructive',
            percentage >= 33 && percentage < 66 && 'bg-[rgb(var(--color-warning))]',
            percentage >= 66 && percentage < 100 && 'bg-[var(--color-2-nuance-1)]',
            percentage === 100 && 'bg-[rgb(10, 134, 66)]',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
