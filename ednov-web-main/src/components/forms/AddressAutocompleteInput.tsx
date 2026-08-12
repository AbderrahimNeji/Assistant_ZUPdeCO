import * as React from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAddressAutocomplete,
  type AddressSelectionResult,
} from '@/hooks/useAddressAutocomplete';
import { cn } from '@/lib/utils';

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelection: (result: AddressSelectionResult) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  state?: 'default' | 'error' | 'success' | 'warning';
  error?: string;
  helperText?: string;
  maxLength?: number;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChange,
  onBlur,
  onSelection,
  label = 'Adresse',
  placeholder = 'Ex: 12 rue de la République, Paris',
  required = false,
  disabled = false,
  state = 'default',
  error,
  helperText,
  maxLength = 255,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputId = `address-input-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  const autocomplete = useAddressAutocomplete({
    minCharacters: 3,
    debounceMs: 300,
    onSelection: (result) => {
      onSelection(result);
      onChange(result.addressLine1);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    autocomplete.setQuery(newValue);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      autocomplete.clearSuggestions();
      onBlur?.();
    }, 200);
  };

  const handleSuggestionClick = (suggestion: any) => {
    autocomplete.handleSelectSuggestion(suggestion);
  };

  const effectiveState = error ? 'error' : state;
  const showSuggestions = autocomplete.isOpen && autocomplete.suggestions.length > 0;

  return (
    <div className="w-full space-y-2" ref={containerRef}>
      {label && (
        <Label htmlFor={inputId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}
      <div className="relative">
        <MapPin className="modern-input-icon modern-input-icon-left modern-input-icon-md" />
        <ShadcnInput
          id={inputId}
          type="text"
          className={cn(
            'modern-input-md modern-input-default modern-input-with-icon-left modern-input-with-icon-right',
            effectiveState === 'error' && 'modern-input-error',
            effectiveState === 'success' && 'modern-input-success',
            effectiveState === 'warning' && 'modern-input-warning',
          )}
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          required={required}
          aria-invalid={effectiveState === 'error'}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
        />
        <div className="absolute right-3 top-[calc(50%-1px)] -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {autocomplete.isLoading && (
            <Loader2
              className="h-4 w-4 animate-spin pointer-events-none"
              style={{ color: 'var(--color-3-nuance-1)' }}
            />
          )}
        </div>
        {showSuggestions && (
          <div className="modern-dropdown">
            {autocomplete.suggestions.map((suggestion) => (
              <button
                key={`${suggestion.label}-${suggestion.coordinates?.lat}-${suggestion.coordinates?.lng}`}
                type="button"
                className="modern-dropdown-item text-left"
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-start gap-2 w-full">
                  <MapPin className="w-4 h-4 text-[var(--color-1-nuance-1)] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-medium truncate">{suggestion.label}</div>
                    {suggestion.context && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {suggestion.context}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
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
};
