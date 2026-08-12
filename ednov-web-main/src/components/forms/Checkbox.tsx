import * as React from 'react';
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  label?: string;
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  state?: 'default' | 'error' | 'success' | 'warning';
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onCheckedChange,
  onBlur,
  error,
  helperText,
  required,
  disabled,
  className,
  id,
  state,
}) => {
  const checkboxId = id || `checkbox-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-3">
        <ShadcnCheckbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={cn(
            error && 'border-destructive',
            state === 'success' && 'border-[rgb(10, 134, 66)]',
            state === 'warning' && 'border-[rgb(var(--color-warning))]',
          )}
        />
        {label && (
          <Label
            htmlFor={checkboxId}
            className={cn(
              'form-label leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer',
              'text-base',
              required && 'form-label-required',
            )}
          >
            {label}
          </Label>
        )}
      </div>
      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
