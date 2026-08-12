import * as React from 'react';
import { cn } from '@/lib/utils';
import { Minus } from 'lucide-react';

interface EmptyPlaceholderProps {
  message?: string;
  className?: string;
}

export const EmptyPlaceholder: React.FC<EmptyPlaceholderProps> = ({
  message = 'Aucune information',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground',
        'bg-muted/30 border border-dashed border-muted-foreground/30',
        'animate-in fade-in duration-200',
        className,
      )}
    >
      <Minus className="w-4 h-4 opacity-50" />
      <span className="italic">{message}</span>
    </div>
  );
};
