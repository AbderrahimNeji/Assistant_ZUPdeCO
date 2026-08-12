import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SegmentedControl = <T extends string = string>({
  value,
  onChange,
  options,
  disabled = false,
  className,
  size = 'md',
}: SegmentedControlProps<T>) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <div
      className={cn(
        'flex rounded-lg overflow-hidden',
        'border border-[color-mix(in_srgb,var(--color-1-nuance-3)_40%,transparent)]',
        className,
      )}
    >
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
              sizeClasses[size],
              'font-medium transition-all duration-200',
              isActive
                ? 'bg-[var(--color-2-nuance-1)] text-white'
                : 'bg-transparent text-[var(--color-1-nuance-1)] hover:bg-[color-mix(in_srgb,var(--color-1-nuance-3)_10%,transparent)]',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {Icon && <Icon className="h-4 w-4 inline-block mr-1.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
