import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (_value: string) => void;
  onComplete?: (_value: string) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export const OtpInput = React.forwardRef<HTMLDivElement, OtpInputProps>(
  (
    { length = 6, value, onChange, onComplete, error = false, disabled = false, className },
    ref,
  ) => {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const [localValues, setLocalValues] = React.useState<string[]>(Array(length).fill(''));

    // Sync local values with prop value
    React.useEffect(() => {
      const values = value.split('').slice(0, length);
      const paddedValues = [...values, ...Array(length - values.length).fill('')];
      setLocalValues(paddedValues);
    }, [value, length]);

    const focusInput = (index: number) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index]?.focus();
      }
    };

    const handleChange = (index: number, inputValue: string) => {
      if (disabled) return;

      // Only allow digits
      const digit = inputValue.replace(/\D/g, '').slice(-1);

      const newValues = [...localValues];
      newValues[index] = digit;
      setLocalValues(newValues);

      const newValue = newValues.join('');
      onChange(newValue);

      // Auto-focus next input
      if (digit && index < length - 1) {
        focusInput(index + 1);
      }

      // Call onComplete if all digits are filled
      if (newValue.length === length && onComplete) {
        onComplete(newValue);
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      // Backspace: clear current and move to previous
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newValues = [...localValues];

        if (localValues[index]) {
          // Clear current input
          newValues[index] = '';
          setLocalValues(newValues);
          onChange(newValues.join(''));
        } else if (index > 0) {
          // Move to previous and clear it
          newValues[index - 1] = '';
          setLocalValues(newValues);
          onChange(newValues.join(''));
          focusInput(index - 1);
        }
      }

      // Arrow left
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      }

      // Arrow right
      if (e.key === 'ArrowRight' && index < length - 1) {
        e.preventDefault();
        focusInput(index + 1);
      }

      // Home key
      if (e.key === 'Home') {
        e.preventDefault();
        focusInput(0);
      }

      // End key
      if (e.key === 'End') {
        e.preventDefault();
        focusInput(length - 1);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      e.preventDefault();
      const pastedData = e.clipboardData.getData('text');

      // Extract only digits from pasted content
      const digits = pastedData.replace(/\D/g, '').slice(0, length);

      if (digits.length > 0) {
        const newValues = digits.split('');
        // Pad with empty strings if needed
        while (newValues.length < length) {
          newValues.push('');
        }

        setLocalValues(newValues);
        const newValue = newValues.join('');
        onChange(newValue);

        // Focus the next empty input or the last one
        const nextEmptyIndex = newValues.findIndex((v) => !v);
        if (nextEmptyIndex !== -1) {
          focusInput(nextEmptyIndex);
        } else {
          focusInput(length - 1);
        }

        // Call onComplete if all digits are filled
        if (newValue.length === length && onComplete) {
          onComplete(newValue);
        }
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    return (
      <div ref={ref} className={cn('flex gap-2 justify-center', className)}>
        {localValues.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              'w-12 h-14 text-center text-2xl font-semibold rounded-xl',
              'border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'bg-[rgb(var(--card-rgb)/0.3)] backdrop-blur-[8px]',
              'text-foreground',
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/50 animate-shake'
                : 'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] focus:border-[var(--color-2-nuance-1)] focus:ring-[var(--color-2-nuance-1)]/50',
              digit &&
                !error &&
                'border-[var(--color-2-nuance-1)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_8%,transparent)]',
              disabled && 'opacity-50 cursor-not-allowed',
              'hover:border-[color-mix(in_srgb,var(--color-1-nuance-2)_70%,transparent)]',
            )}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
    );
  },
);

OtpInput.displayName = 'OtpInput';
