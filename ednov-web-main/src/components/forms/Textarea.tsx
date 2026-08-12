import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
  containerClassName?: string;
  state?: 'default' | 'error' | 'success' | 'warning';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      maxLength,
      showCharCount = false,
      autoResize = false,
      className,
      containerClassName,
      id,
      required,
      value,
      onChange,
      rows = 4,
      state,
      ...props
    },
    ref,
  ) => {
    const textareaId = id || `textarea-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [charCount, setCharCount] = React.useState(0);

    React.useImperativeHandle(ref, () => textareaRef.current!);

    React.useEffect(() => {
      if (value !== undefined) {
        setCharCount(String(value).length);
      }
    }, [value]);

    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [value, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (onChange) {
        onChange(e);
      }
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    const effectiveState = error ? 'error' : state || 'default';

    return (
      <div className={cn('w-full space-y-2', containerClassName)}>
        {label && (
          <Label
            htmlFor={textareaId}
            className={cn('form-label', required && 'form-label-required')}
          >
            {label}
          </Label>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={textareaId}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            rows={rows}
            className={cn(
              'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'resize-none',
              effectiveState === 'error' && 'border-destructive focus-visible:ring-destructive',
              effectiveState === 'success' &&
                'border-[rgb(10, 134, 66)] focus-visible:ring-[rgb(10, 134, 66)]',
              effectiveState === 'warning' &&
                'border-[rgb(var(--color-warning))] focus-visible:ring-[rgb(var(--color-warning))]',
              className,
            )}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={
              error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
            }
            {...props}
          />
          {Boolean(showCharCount && maxLength) && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {charCount}/{maxLength}
            </div>
          )}
        </div>
        {error && (
          <p id={`${textareaId}-error`} className="form-error-text" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="form-helper-text">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
