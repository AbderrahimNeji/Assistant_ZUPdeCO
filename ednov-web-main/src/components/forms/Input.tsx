import * as React from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LucideIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  labelTooltip?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  validation?: (value: string) => string | undefined;
  variant?: 'default' | 'filled' | 'ghost';
  state?: 'default' | 'error' | 'success' | 'warning';
  inputSize?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, CustomInputProps>(
  (
    {
      label,
      labelTooltip,
      error,
      helperText,
      icon: Icon,
      iconPosition = 'left',
      className,
      id,
      required,
      variant = 'default',
      state = 'default',
      inputSize = 'md',
      showPasswordToggle = false,
      type,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;
    const [showPassword, setShowPassword] = React.useState(false);

    const effectiveState = error ? 'error' : state;
    const isPasswordInput = type === 'password';
    const shouldShowToggle = isPasswordInput && showPasswordToggle;
    const effectiveType = shouldShowToggle && showPassword ? 'text' : type;

    const StateIcon =
      effectiveState === 'error'
        ? AlertCircle
        : effectiveState === 'success'
          ? CheckCircle2
          : effectiveState === 'warning'
            ? AlertTriangle
            : null;

    const showStateIcon = effectiveState !== 'default' && !Icon && !shouldShowToggle;

    const getIconSizeClass = () => {
      if (inputSize === 'sm') return 'modern-input-icon-sm';
      if (inputSize === 'lg') return 'modern-input-icon-lg';
      return 'modern-input-icon-md';
    };

    const iconSizeClass = getIconSizeClass();

    const PasswordToggleIcon = showPassword ? EyeOff : Eye;

    return (
      <div className="w-full space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn('form-label', required && 'form-label-required')}>
            {label}
            {labelTooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help ml-1 opacity-50 align-middle">
                      <Info size={13} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{labelTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Label>
        )}
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <Icon className={cn('modern-input-icon modern-input-icon-left', iconSizeClass)} />
          )}
          {showStateIcon && StateIcon && (
            <StateIcon
              className={cn(
                'modern-input-icon modern-input-icon-right',
                iconSizeClass,
                effectiveState === 'error' && 'text-destructive',
                effectiveState === 'success' && 'text-[rgb(10, 134, 66)]',
                effectiveState === 'warning' && 'text-[rgb(var(--color-warning))]',
              )}
            />
          )}
          <ShadcnInput
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={cn(
              `modern-input-${inputSize}`,
              `modern-input-${variant}`,
              Icon && iconPosition === 'left' && 'modern-input-with-icon-left',
              Icon && iconPosition === 'right' && 'modern-input-with-icon-right',
              showStateIcon && 'modern-input-with-icon-right',
              shouldShowToggle && 'modern-input-with-icon-right',
              effectiveState === 'error' && 'modern-input-error',
              effectiveState === 'success' && 'modern-input-success',
              effectiveState === 'warning' && 'modern-input-warning',
              className,
            )}
            required={required}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {shouldShowToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'flex items-center justify-center',
                'w-10 h-10 rounded-lg',
                'text-[var(--color-1-nuance-2)]',
                'hover:text-[var(--color-1-nuance-1)]',
                'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]',
                'transition-all duration-200',
                'cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-2-nuance-1)]/40',
                'focus-visible:border-2 focus-visible:border-[var(--color-2-nuance-1)]',
              )}
              tabIndex={-1}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              <PasswordToggleIcon className="h-5 w-5" />
            </button>
          )}
          {Icon && iconPosition === 'right' && !showStateIcon && !shouldShowToggle && (
            <Icon className={cn('modern-input-icon modern-input-icon-right', iconSizeClass)} />
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="form-error-text" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="form-helper-text">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
