import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, X, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelectOption } from './Select';

type TagVariant = 'primary' | 'secondary' | 'accent';
type InputState = 'default' | 'error' | 'success' | 'warning';
type DropdownPlacement = 'top' | 'bottom';

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string[];
  onChange?: (values: string[]) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxHeight?: string;
  maxVisibleTags?: number;
  tagVariant?: TagVariant;
  showSelectAll?: boolean;
  state?: InputState;
  placement?: DropdownPlacement;
  onSearch?: (query: string) => void;
  isSearchLoading?: boolean;
  searchPlaceholder?: string;
  minSearchLength?: number;
  inputSize?: 'sm' | 'md' | 'lg';
}

interface SelectedTagProps {
  option: SelectOption;
  tagVariant: TagVariant;
  onRemove: (value: string, e: React.MouseEvent) => void;
}

const SelectedTag: React.FC<SelectedTagProps> = ({ option, tagVariant, onRemove }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRemove(option.value, e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      className={cn(
        'modern-tag',
        tagVariant === 'primary' && 'modern-tag-primary',
        tagVariant === 'secondary' && 'modern-tag-secondary',
        tagVariant === 'accent' && 'modern-tag-accent',
      )}
    >
      <span className="modern-tag-text">{option.label}</span>
      <button
        type="button"
        className="modern-tag-remove-btn"
        onClick={(e) => onRemove(option.value, e)}
        onKeyDown={handleKeyDown}
        aria-label={`Retirer ${option.label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

interface DropdownOptionProps {
  option: SelectOption;
  index: number;
  isSelected: boolean;
  onToggle: (value: string) => void;
}

const DropdownOption: React.FC<DropdownOptionProps> = ({ option, index, isSelected, onToggle }) => (
  <div
    key={option.value}
    role="button"
    tabIndex={option.disabled ? -1 : 0}
    aria-disabled={option.disabled}
    className={cn(
      'modern-dropdown-item',
      'stagger-item',
      isSelected && 'modern-dropdown-item-selected',
      option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    )}
    style={{ '--stagger-index': index } as React.CSSProperties}
    onClick={() => !option.disabled && onToggle(option.value)}
    onKeyDown={(e) => {
      if (!option.disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onToggle(option.value);
      }
    }}
  >
    <Checkbox checked={isSelected} disabled={option.disabled} className="mr-3" />
    <span className="flex-1 text-left">{option.label}</span>
  </div>
);

interface SearchBarProps {
  searchQuery: string;
  searchPlaceholder: string;
  isSearchLoading: boolean;
  onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  searchPlaceholder,
  isSearchLoading,
  onChange,
}) => (
  <div className="px-3 py-2 border-b border-border">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        className="w-full pl-9 pr-9 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)]/50"
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(e) => onChange(e.target.value)}
      />
      {isSearchLoading && (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin search-spinner" />
      )}
    </div>
  </div>
);

interface SelectedTagsDisplayProps {
  placeholder: string;
  visibleTags: SelectOption[];
  tagVariant: TagVariant;
  hiddenCount: number;
  showAllTags: boolean;
  onRemove: (value: string, e: React.MouseEvent) => void;
  onToggleShowAll: () => void;
}

const SelectedTagsDisplay: React.FC<SelectedTagsDisplayProps> = ({
  placeholder,
  visibleTags,
  tagVariant,
  hiddenCount,
  showAllTags,
  onRemove,
  onToggleShowAll,
}) => {
  if (visibleTags.length === 0) {
    return <span className="text-muted-foreground/60">{placeholder}</span>;
  }

  return (
    <>
      {visibleTags.map((option) => (
        <SelectedTag
          key={option.value}
          option={option}
          tagVariant={tagVariant}
          onRemove={onRemove}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleShowAll();
          }}
          className="modern-tag modern-tag-secondary cursor-pointer"
        >
          {showAllTags ? 'Voir moins' : `+${hiddenCount} de plus`}
        </button>
      )}
    </>
  );
};

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  placeholder = 'Sélectionner des options',
  options,
  value = [],
  onChange,
  onBlur,
  error,
  helperText,
  required,
  disabled,
  className,
  maxHeight = '320px',
  maxVisibleTags,
  tagVariant = 'primary',
  showSelectAll = true,
  state,
  placement = 'bottom',
  onSearch,
  isSearchLoading = false,
  searchPlaceholder = 'Rechercher...',
  minSearchLength = 0,
  inputSize = 'md',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showAllTags, setShowAllTags] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const multiselectId = `multiselect-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const shouldLimitTags = maxVisibleTags && !showAllTags;
  const visibleTags = shouldLimitTags ? selectedOptions.slice(0, maxVisibleTags) : selectedOptions;
  const hiddenCount = shouldLimitTags ? Math.max(0, selectedOptions.length - maxVisibleTags) : 0;

  const effectiveState = error ? 'error' : state || 'default';

  const getAriaDescribedBy = () => {
    if (error) return `${multiselectId}-error`;
    if (helperText) return `${multiselectId}-helper`;
    return undefined;
  };

  const handleToggle = (optionValue: string) => {
    if (disabled) return;

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];

    onChange?.(newValue);
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== optionValue));
  };

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onChange?.([]);
    } else {
      onChange?.(options.map((opt) => opt.value));
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!onSearch) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (query.length >= minSearchLength) {
        onSearch(query);
      }
    }, 300);
  };

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, onBlur]);

  return (
    <div className={cn('w-full space-y-2', className)} ref={dropdownRef}>
      {label && (
        <Label className={cn('form-label', required && 'form-label-required')}>{label}</Label>
      )}

      <div className="relative">
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          id={multiselectId}
          aria-describedby={getAriaDescribedBy()}
          className={cn(
            'flex h-auto w-full items-center justify-between rounded-xl border-[1.5px] px-3',
            inputSize === 'sm' ? 'min-h-9 py-1.5 text-sm' : 'min-h-11 py-2 text-base',
            'ring-offset-background transition-all duration-200 cursor-pointer select-none',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)]/50 focus:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
            'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
            'bg-[rgb(var(--card-rgb)/0.3)] backdrop-blur-[8px]',
            'hover:border-[color-mix(in_srgb,var(--color-1-nuance-2)_70%,transparent)] hover:shadow-sm',
            isOpen && 'border-[var(--color-2-nuance-1)]',
            effectiveState === 'error' && 'modern-input-error',
            effectiveState === 'success' && 'modern-input-success',
            effectiveState === 'warning' && 'modern-input-warning',
          )}
        >
          <div className="flex flex-wrap gap-2 flex-1">
            <SelectedTagsDisplay
              placeholder={placeholder}
              visibleTags={visibleTags}
              tagVariant={tagVariant}
              hiddenCount={hiddenCount}
              showAllTags={showAllTags}
              onRemove={handleRemove}
              onToggleShowAll={() => setShowAllTags(!showAllTags)}
            />
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 transition-transform duration-200',
              'text-[var(--color-1-nuance-1)]',
              isOpen && 'rotate-180',
            )}
          />
        </div>

        {isOpen && (
          <div
            className={cn(
              'modern-dropdown',
              placement === 'top' && 'bottom-full mb-2',
              placement === 'bottom' && 'top-full mt-2',
            )}
            style={{ maxHeight }}
          >
            {onSearch && (
              <SearchBar
                searchQuery={searchQuery}
                searchPlaceholder={searchPlaceholder}
                isSearchLoading={isSearchLoading}
                onChange={handleSearchChange}
              />
            )}
            {showSelectAll && options.length > 0 && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  className="modern-dropdown-item w-full font-medium text-[var(--color-2-nuance-1)] cursor-pointer"
                  onClick={handleSelectAll}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAll();
                    }
                  }}
                >
                  {value.length === options.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </div>
                <div className="h-px bg-border my-1" />
              </>
            )}
            {options.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                Aucune option disponible
              </div>
            ) : (
              options.map((option, index) => (
                <DropdownOption
                  key={option.value}
                  option={option}
                  index={index}
                  isSelected={value.includes(option.value)}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <p id={`${multiselectId}-error`} className="form-error-text" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${multiselectId}-helper`} className="form-helper-text">
          {helperText}
        </p>
      )}
    </div>
  );
};
