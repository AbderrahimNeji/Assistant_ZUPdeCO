import * as React from 'react';
import { RadioGroup as ShadcnRadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  layout?: 'vertical' | 'horizontal' | 'grid' | 'cards';
  gridCols?: 2 | 3 | 4;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
  onValueChange,
  error,
  helperText,
  required,
  disabled,
  layout = 'vertical',
  gridCols = 2,
  className,
}) => {
  const getLayoutClass = () => {
    if (layout === 'horizontal') return 'flex flex-wrap gap-4';
    if (layout === 'grid') return `grid grid-cols-1 md:grid-cols-${gridCols} gap-4`;
    if (layout === 'cards') return `grid grid-cols-1 md:grid-cols-${gridCols} gap-3`;
    return 'space-y-3';
  };

  const isCardLayout = layout === 'cards';

  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <Label className={cn('form-label', required && 'form-label-required')}>{label}</Label>
      )}

      <ShadcnRadioGroup
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={getLayoutClass()}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              'flex items-start space-x-3',
              isCardLayout && 'rounded-xl border-[1.5px] p-4 transition-all duration-200',
              isCardLayout && 'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
              isCardLayout && 'hover:border-[var(--color-1-nuance-2)] hover:shadow-sm',
              isCardLayout &&
                value === option.value &&
                'border-[var(--color-2-nuance-1)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_5%,transparent)]',
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`radio-${option.value}`}
              disabled={option.disabled || disabled}
              className={cn(error && 'border-destructive', isCardLayout && 'mt-0.5')}
            />
            <div className="flex-1">
              <Label
                htmlFor={`radio-${option.value}`}
                className={cn(
                  'text-base font-medium leading-none cursor-pointer',
                  'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-1.5">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </ShadcnRadioGroup>

      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
