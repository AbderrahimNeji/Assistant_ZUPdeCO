import * as React from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelectOption } from './Select';

const SKELETON_WIDTHS = ['70%', '55%', '80%'];

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onSearch?: (query: string) => void | Promise<void>;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  minSearchLength?: number;
  state?: 'default' | 'error' | 'success' | 'warning';
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  label,
  placeholder = 'Search...',
  options,
  value: _value,
  onChange,
  onBlur,
  onSearch: _onSearch,
  error,
  helperText,
  required,
  disabled,
  isLoading = false,
  className,
  minSearchLength = 2,
  state = 'default',
}) => {
  const value = _value;
  const onSearch = _onSearch;
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = `autocomplete-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < minSearchLength) return options;

    // Strip trailing "(dept)" syntax before client-side filtering so "Jules (50)"
    // still matches labels like "Jules Ferry (Nord - 50)" returned by the server.
    const query = searchQuery
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim()
      .toLowerCase();
    if (!query) return options;

    return options.filter(
      (opt) => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query),
    );
  }, [options, searchQuery, minSearchLength]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    setActiveIndex(-1);

    if (query.length >= minSearchLength) {
      onSearch?.(query);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    const selected = options.find((opt) => opt.value === optionValue);
    setSearchQuery(selected?.label || '');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    onChange?.('');
    setSearchQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < minSearchLength) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <strong key={index} className="font-bold text-[var(--color-2-nuance-1)]">
          {part}
        </strong>
      ) : (
        part
      ),
    );
  };

  const prevValueRef = React.useRef(value);
  React.useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (!value) {
        setSearchQuery('');
      } else if (selectedOption) {
        setSearchQuery(selectedOption.label);
      } else {
        setSearchQuery('');
      }
    } else if (selectedOption && !searchQuery) {
      setSearchQuery(selectedOption.label);
    }
  }, [value, selectedOption, searchQuery]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showMinLengthHint = searchQuery.length > 0 && searchQuery.length < minSearchLength;

  return (
    <div className={cn('w-full space-y-2', className)} ref={dropdownRef}>
      {label && (
        <Label htmlFor={inputId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}

      <div className="relative">
        <Search className="modern-input-icon modern-input-icon-left modern-input-icon-md" />
        <ShadcnInput
          ref={inputRef}
          id={inputId}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onBlur={onBlur}
          onFocus={() => {
            setIsOpen(true);
            if (selectedOption) {
              setSearchQuery(''); // Clear pour montrer le placeholder
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'modern-input-sm', // FIXER : utiliser sm au lieu de md
            'modern-input-default',
            'modern-input-with-icon-left modern-input-with-icon-right',
            error && 'modern-input-error',
            state === 'error' && 'modern-input-error',
            state === 'success' && 'modern-input-success',
            state === 'warning' && 'modern-input-warning',
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin pointer-events-none search-spinner" />
          )}
          {!isLoading && value && (
            <button
              type="button"
              onClick={handleClear}
              className="h-4 w-4 flex items-center justify-center pointer-events-auto"
            >
              <X className="h-4 w-4" style={{ color: 'var(--color-3-nuance-1)' }} />
            </button>
          )}
        </div>

        {showMinLengthHint && (
          <div className="absolute z-50 mt-2 w-full rounded-xl border border-border/50 bg-popover/95 backdrop-blur-lg shadow-md p-3 text-center text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <p className="font-medium">
              Tapez au moins {minSearchLength} caractères pour rechercher
            </p>
          </div>
        )}

        {isOpen && !showMinLengthHint && filteredOptions.length > 0 && (
          <div className="modern-dropdown modern-dropdown-lg">
            {filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                className={cn(
                  'modern-dropdown-item',
                  'stagger-item',
                  value === option.value && 'modern-dropdown-item-selected',
                  activeIndex === index && 'modern-dropdown-item-keyboard-active',
                )}
                style={{ '--stagger-index': index } as React.CSSProperties}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {highlightMatch(option.label, searchQuery)}
              </button>
            ))}
          </div>
        )}

        {isOpen &&
          !showMinLengthHint &&
          filteredOptions.length === 0 &&
          searchQuery.length >= minSearchLength &&
          !isLoading && (
            <div className="modern-dropdown">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-base font-medium text-muted-foreground">No results found</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Try different keywords</p>
              </div>
            </div>
          )}

        {isOpen && isLoading && searchQuery.length >= minSearchLength && (
          <div className="modern-dropdown">
            {SKELETON_WIDTHS.map((width, i) => (
              <div
                key={width}
                className="modern-dropdown-item"
                style={{ '--stagger-index': i } as React.CSSProperties}
              >
                <div
                  className="h-3.5 rounded animate-pulse"
                  style={{
                    width,
                    background: 'color-mix(in srgb, var(--color-2-nuance-1) 18%, transparent)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
