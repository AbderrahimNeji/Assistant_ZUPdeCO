import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface OptionsToggleProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
  disabled?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
}

export const OptionsToggle = <T extends string = string>({
  value,
  onChange,
  options,
  disabled = false,
  label,
  helperText,
  className,
}: OptionsToggleProps<T>) => {
  let gridCols = 'grid-cols-4';
  if (options.length === 2) {
    gridCols = 'grid-cols-2';
  } else if (options.length === 3) {
    gridCols = 'grid-cols-3';
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && <Label className="form-label">{label}</Label>}

      <div className={cn('grid gap-3', gridCols)}>
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center gap-2 p-4 rounded-xl border-[1.5px]',
                'transition-all duration-200',
                'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
                'hover:border-[var(--color-1-nuance-2)] hover:shadow-sm',
                isActive && [
                  'border-[var(--color-2-nuance-1)]',
                  'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_5%,transparent)]',
                ],
                disabled &&
                  'opacity-50 cursor-not-allowed hover:border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] hover:shadow-none',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive ? 'text-[var(--color-2-nuance-1)]' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-base font-medium transition-colors',
                  isActive ? 'text-[var(--color-2-nuance-1)]' : 'text-foreground',
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {helperText && !disabled && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
