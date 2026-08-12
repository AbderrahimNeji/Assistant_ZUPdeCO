import * as React from 'react';
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'error' | 'success' | 'warning';
  side?: 'top' | 'bottom';
  contentClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Sélectionner une option',
  options,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required,
  disabled,
  className,
  size = 'md',
  state,
  side,
  contentClassName,
}) => {
  const selectId = `select-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;
  const [open, setOpen] = React.useState(false);

  const effectiveState = error ? 'error' : state || 'default';

  const handleOpenChange = (isOpen: boolean) => {
    // Petit délai pour éviter les conflits entre plusieurs Select
    if (isOpen) {
      requestAnimationFrame(() => {
        setOpen(true);
      });
    } else {
      setOpen(false);
    }
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <Label htmlFor={selectId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}
      <ShadcnSelect
        value={value === '' ? undefined : value}
        onValueChange={onChange}
        disabled={disabled}
        open={open}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger
          id={selectId}
          onBlur={onBlur}
          className={cn(
            effectiveState === 'error' && 'modern-input-error',
            effectiveState === 'success' && 'modern-input-success',
            effectiveState === 'warning' && 'modern-input-warning',
            size === 'sm' && 'h-9 px-3 py-2 text-sm',
            size === 'lg' && 'h-13 px-5 py-3.5 text-lg',
          )}
          aria-invalid={effectiveState === 'error'}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          side={side}
          className={cn(size === 'lg' ? 'modern-dropdown-lg' : undefined, contentClassName)}
        >
          {options.filter((option) => option.value !== '').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--color-1-nuance-3)_20%,transparent)] flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Aucune option disponible
              </p>
              <p className="text-xs text-muted-foreground/70">
                {label ? `Aucun(e) ${label.toLowerCase()} à sélectionner` : 'Liste vide'}
              </p>
            </div>
          ) : (
            options
              .filter((option) => option.value !== '')
              .map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))
          )}
        </SelectContent>
      </ShadcnSelect>
      {error && (
        <p id={`${selectId}-error`} className="form-error-text" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="form-helper-text">
          {helperText}
        </p>
      )}
    </div>
  );
};
