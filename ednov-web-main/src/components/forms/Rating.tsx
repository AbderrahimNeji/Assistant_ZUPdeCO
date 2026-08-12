import * as React from 'react';
import { Star, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  onBlur?: () => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  showLabel?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  state?: 'default' | 'error' | 'success' | 'warning';
}

export const Rating: React.FC<RatingProps> = ({
  value,
  onChange,
  onBlur,
  max = 5,
  size = 'md',
  readOnly = false,
  showLabel = true,
  label = 'Note',
  required = false,
  error,
  helperText,
  state,
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const handleClick = (rating: number) => {
    if (readOnly || !onChange) return;
    onChange(rating);
  };

  const handleClear = () => {
    if (readOnly || !onChange) return;
    onChange(null);
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className="w-full space-y-2">
      {showLabel && label && (
        <Label className={cn('form-label', required && 'form-label-required')}>{label}</Label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-xl border-[1.5px] transition-all duration-200',
          'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
          state === 'error' && 'border-destructive',
          state === 'success' && 'border-[rgb(10, 134, 66)]',
          state === 'warning' && 'border-[rgb(var(--color-warning))]',
          readOnly && !showLabel && 'border-transparent p-0',
        )}
        onBlur={onBlur}
      >
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => !readOnly && setHoverValue(null)}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
            const isFilled = displayValue !== null && rating <= displayValue;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => handleClick(rating)}
                onMouseEnter={() => !readOnly && setHoverValue(rating)}
                disabled={readOnly}
                className={cn(
                  'transition-all duration-200',
                  !readOnly && 'cursor-pointer hover:scale-110',
                  readOnly && 'cursor-default',
                )}
                aria-label={`Note ${rating} sur ${max}`}
              >
                <Star
                  className={cn(
                    getSizeClasses(),
                    'transition-colors duration-200',
                    isFilled ? 'fill-amber-500 text-amber-500' : 'fill-none text-amber-400',
                    !readOnly && 'hover:text-amber-500',
                  )}
                />
              </button>
            );
          })}
        </div>
        {value !== null && !readOnly && onChange && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Effacer la note"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {value !== null && (
          <span className="text-sm text-muted-foreground ml-1">
            {value}/{max}
          </span>
        )}
      </div>
      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
