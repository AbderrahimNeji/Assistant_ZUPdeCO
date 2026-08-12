import * as React from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Search, Loader2, X, LucideIcon, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchFilter {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  onSearch?: (query: string) => void | Promise<void>;
  onClear?: () => void;
  isLoading?: boolean;
  debounceMs?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined' | 'ghost';
  iconColor?: string;
  shortcut?: string | false;
  showShortcutHint?: boolean;
  suggestions?: string[];
  showHistory?: boolean;
  maxHistoryItems?: number;
  filters?: SearchFilter[];
  activeFilters?: string[];
  onFilterToggle?: (filterId: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      onSearch,
      onClear,
      isLoading = false,
      debounceMs = 300,
      size = 'md',
      variant = 'default',
      iconColor,
      shortcut = 'Ctrl+K',
      showShortcutHint = true,
      suggestions = [],
      showHistory = false,
      maxHistoryItems = 5,
      filters = [],
      activeFilters = [],
      onFilterToggle,
      className,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || '');
    const [isFocused, setIsFocused] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [searchHistory, setSearchHistory] = React.useState<string[]>([]);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    React.useEffect(() => {
      if (showHistory) {
        const stored = localStorage.getItem('search-history');
        if (stored) {
          try {
            setSearchHistory(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse search history', e);
          }
        }
      }
    }, [showHistory]);

    React.useEffect(() => {
      if (!shortcut) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcut]);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onChange?.(e);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (onSearch) {
        timeoutRef.current = setTimeout(() => {
          onSearch(newValue);
          if (newValue && showHistory) {
            const newHistory = [newValue, ...searchHistory.filter((h) => h !== newValue)].slice(
              0,
              maxHistoryItems,
            );
            setSearchHistory(newHistory);
            localStorage.setItem('search-history', JSON.stringify(newHistory));
          }
        }, debounceMs);
      }
    };

    const handleClear = () => {
      setInternalValue('');
      onClear?.();

      if (onChange) {
        const event = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }

      inputRef.current?.focus();
    };

    const handleHistoryClick = (query: string) => {
      setInternalValue(query);
      if (onChange) {
        const event = {
          target: { value: query },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
      onSearch?.(query);
      setShowSuggestions(false);
    };

    const handleSuggestionClick = (suggestion: string) => {
      setInternalValue(suggestion);
      if (onChange) {
        const event = {
          target: { value: suggestion },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
      onSearch?.(suggestion);
      setShowSuggestions(false);
    };

    const handleClearHistory = () => {
      setSearchHistory([]);
      localStorage.removeItem('search-history');
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const iconSizeClass =
      size === 'sm'
        ? 'modern-input-icon-sm'
        : size === 'lg'
          ? 'modern-input-icon-lg'
          : 'modern-input-icon-md';

    const showDropdown = isFocused && (searchHistory.length > 0 || suggestions.length > 0);

    return (
      <div className={cn('w-full space-y-3', className)} ref={dropdownRef}>
        <div className="relative">
          <Search
            className={cn('modern-input-icon modern-input-icon-left', iconSizeClass)}
            style={iconColor ? { color: iconColor } : undefined}
          />
          <ShadcnInput
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type="text"
            value={internalValue}
            onChange={handleChange}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsFocused(false);
                setShowSuggestions(false);
              }, 200);
            }}
            className={cn(
              `modern-input-${size}`,
              `modern-input-${variant}`,
              'modern-input-with-icon-left',
              (isLoading || internalValue || (shortcut && showShortcutHint)) &&
                'modern-input-with-icon-right',
            )}
            {...props}
          />
          {isLoading && (
            <Loader2
              className={cn(
                'modern-input-icon modern-input-icon-right animate-spin',
                iconSizeClass,
              )}
              style={{ color: 'var(--color-3-nuance-1)' }}
            />
          )}
          {!isLoading && internalValue && (
            <X
              className={cn(
                'modern-input-icon modern-input-icon-right modern-input-icon-clickable',
                iconSizeClass,
              )}
              onClick={handleClear}
            />
          )}
          {!isLoading && !internalValue && shortcut && showShortcutHint && !isFocused && (
            <div className="modern-search-shortcut-badge">
              <kbd className="text-xs">{shortcut}</kbd>
            </div>
          )}

          {showDropdown && showSuggestions && (
            <div className="modern-dropdown-content w-full mt-2">
              {showHistory && searchHistory.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Clock className="h-4 w-4" />
                      Recent Searches
                    </div>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {searchHistory.map((item, index) => (
                    <button
                      key={`history-${index}`}
                      type="button"
                      onClick={() => handleHistoryClick(item)}
                      className="modern-dropdown-item stagger-item w-full"
                      style={{ '--stagger-index': index } as React.CSSProperties}
                    >
                      <Clock className="h-4 w-4 mr-3 text-muted-foreground" />
                      <span className="flex-1 text-left">{item}</span>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    Suggestions
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}`}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="modern-dropdown-item stagger-item w-full"
                      style={
                        { '--stagger-index': searchHistory.length + index } as React.CSSProperties
                      }
                    >
                      <Sparkles className="h-4 w-4 mr-3 text-[var(--color-3-nuance-1)]" />
                      <span className="flex-1 text-left">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeFilters.includes(filter.id);
              const FilterIcon = filter.icon;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onFilterToggle?.(filter.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
                    'border-[1.5px] transition-all duration-200 hover:scale-105',
                    isActive
                      ? 'bg-[linear-gradient(135deg,var(--color-2-nuance-1),var(--color-2-nuance-2))] border-[var(--color-2-nuance-1)] text-white shadow-sm'
                      : 'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-transparent hover:border-[var(--color-1-nuance-2)]',
                  )}
                >
                  {FilterIcon && <FilterIcon className="h-4 w-4" />}
                  {filter.label}
                  {isActive && <X className="h-3.5 w-3.5 ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
