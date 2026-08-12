import * as React from 'react';
import { Label } from '@/components/ui/label';
import { ChevronDown, Check, Search, CheckCircle2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  getPhoneFormat,
  formatPhoneByCountry,
  getPhoneValidationState,
  normalizePhoneToLocal,
} from '@/utils/phone-formats';

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹' },
  { code: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dial: '+216', flag: '🇹🇳' },
  { code: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯' },
  { code: 'MR', name: 'Mauritanie', dial: '+222', flag: '🇲🇷' },
  { code: 'GN', name: 'Guinée', dial: '+224', flag: '🇬🇳' },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', dial: '+243', flag: '🇨🇩' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { code: 'TD', name: 'Tchad', dial: '+235', flag: '🇹🇩' },
  { code: 'CF', name: 'Centrafrique', dial: '+236', flag: '🇨🇫' },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
  { code: 'KM', name: 'Comores', dial: '+269', flag: '🇰🇲' },
  { code: 'HT', name: 'Haïti', dial: '+509', flag: '🇭🇹' },
  { code: 'MQ', name: 'Martinique', dial: '+596', flag: '🇲🇶' },
  { code: 'GP', name: 'Guadeloupe', dial: '+590', flag: '🇬🇵' },
  { code: 'GF', name: 'Guyane', dial: '+594', flag: '🇬🇫' },
  { code: 'RE', name: 'Réunion', dial: '+262', flag: '🇷🇪' },
  { code: 'NC', name: 'Nouvelle-Calédonie', dial: '+687', flag: '🇳🇨' },
  { code: 'PF', name: 'Polynésie française', dial: '+689', flag: '🇵🇫' },
  { code: 'LB', name: 'Liban', dial: '+961', flag: '🇱🇧' },
];

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelTooltip?: string;
  error?: string;
  helperText?: string;
  countryCode?: string;
  onCountryChange?: (country: Country) => void;
  state?: 'default' | 'error' | 'success' | 'warning';
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      label,
      labelTooltip,
      error,
      helperText,
      className,
      id,
      required,
      countryCode = '+33',
      onCountryChange,
      value,
      onChange,
      disabled,
      state,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `phone-input-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCountry, setSelectedCountry] = React.useState<Country>(
      // Accepte l'ISO (e.g. 'FR') ou l'indicatif complet (e.g. '+33')
      countries.find((c) => c.code === countryCode || c.dial === countryCode) || countries[0],
    );

    // Sync si countryCode change sans remontage du composant
    React.useEffect(() => {
      if (!countryCode) return;
      const match = countries.find((c) => c.code === countryCode || c.dial === countryCode);
      if (match && match.code !== selectedCountry.code) {
        setSelectedCountry(match);
      }
    }, [countryCode]);
    const [isShaking, setIsShaking] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Get validation state based on country format
    // Only show success when valid, never show error icon (shake handles overflow)
    const validationState = React.useMemo(() => {
      // Si state est passé en prop, l'utiliser en priorité
      if (state && state !== 'default') return state;

      // Sinon utiliser la validation interne
      if (!value || typeof value !== 'string') return 'default';
      const internalState = getPhoneValidationState(String(value), selectedCountry.code);
      // Ne jamais afficher 'error' pour éviter l'icône rouge
      return internalState === 'error' ? 'default' : internalState;
    }, [value, selectedCountry.code, state]);

    // Get placeholder from phone format
    const placeholder = React.useMemo(() => {
      const format = getPhoneFormat(selectedCountry.code);
      return format?.placeholder || '6 12 34 56 78';
    }, [selectedCountry.code]);

    const filteredCountries = React.useMemo(() => {
      if (!searchQuery) return countries;
      const query = searchQuery.toLowerCase();
      return countries.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.dial.includes(query) ||
          c.code.toLowerCase().includes(query),
      );
    }, [searchQuery]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Remove all non-digit characters first, then normalize international prefix to local format
      let digitsOnly = inputValue.replaceAll(/\D/g, '');
      digitsOnly = normalizePhoneToLocal(digitsOnly, selectedCountry.code);

      // Get format to check maxLength
      const format = getPhoneFormat(selectedCountry.code);

      // Block input if exceeds maxLength and trigger shake
      if (format && digitsOnly.length > format.maxLength) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return; // Don't update value
      }

      // Format according to country
      const formatted = formatPhoneByCountry(digitsOnly, selectedCountry.code);

      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: formatted,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(newEvent);
    };

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      onCountryChange?.(country);
      setIsOpen(false);
      setSearchQuery('');

      // Reformater le numéro existant selon le nouveau pays
      if (value && typeof value === 'string') {
        let digitsOnly = String(value).replaceAll(/\D/g, '');
        digitsOnly = normalizePhoneToLocal(digitsOnly, country.code);
        const reformatted = formatPhoneByCountry(digitsOnly, country.code);

        // Créer un événement synthétique pour mettre à jour la valeur
        if (onChange) {
          const syntheticEvent = {
            target: {
              value: reformatted,
            },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      }
    };

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div className="relative" ref={dropdownRef}>
          <div
            className={cn(
              'flex items-center rounded-xl border-[1.5px] transition-all duration-200',
              'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
              'bg-[rgb(var(--card-rgb)/0.3)] backdrop-blur-[8px]',
              'hover:border-[color-mix(in_srgb,var(--color-1-nuance-2)_70%,transparent)] hover:shadow-sm',
              'focus-within:border-[var(--color-2-nuance-1)]',
              'focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-2-nuance-1)_25%,transparent),0_4px_16px_color-mix(in_srgb,var(--color-2-nuance-1)_30%,transparent)]',
              error && 'modern-input-error',
              validationState === 'error' && 'modern-input-error',
              validationState === 'success' && 'modern-input-success',
              validationState === 'warning' && 'modern-input-warning',
              disabled && 'opacity-60 cursor-not-allowed',
              isShaking && 'shake-error',
            )}
          >
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-2 px-3 py-3 border-r transition-all duration-300',
                'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
                'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_12%,transparent)]',
                'rounded-l-xl active:scale-95',
              )}
            >
              <span className="text-xl transition-transform duration-300 hover:scale-110">
                {selectedCountry.flag}
              </span>
              <span className="text-sm font-medium">{selectedCountry.dial}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-[var(--color-1-nuance-1)] transition-all duration-300',
                  isOpen && 'rotate-180 text-[var(--color-2-nuance-1)]',
                )}
              />
            </button>

            <input
              ref={ref}
              id={inputId}
              type="tel"
              value={value}
              onChange={handleChange}
              disabled={disabled}
              required={required}
              placeholder={placeholder}
              aria-invalid={!!error}
              aria-describedby={(() => {
                if (error) return `${inputId}-error`;
                if (helperText) return `${inputId}-helper`;
                return undefined;
              })()}
              className={cn(
                'flex-1 h-11 px-4 py-3 bg-transparent border-none outline-none text-base font-medium',
                'placeholder:text-muted-foreground/60 placeholder:font-normal',
                'disabled:cursor-not-allowed',
                !error && validationState === 'success' && 'pr-11',
                className,
              )}
              {...props}
            />

            {/* Validation Icon - Inside input on the right */}
            {!error && validationState === 'success' && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[rgb(10, 134, 66)] phone-input-success-icon" />
            )}
          </div>

          {isOpen && (
            <div className="modern-dropdown-content w-full">
              <div className="p-2 border-b border-border/50 mb-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un pays..."
                    className="w-full h-9 pl-10 pr-3 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:border-[var(--color-2-nuance-1)]"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {filteredCountries.map((country, index) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      'modern-dropdown-item stagger-item w-full',
                      selectedCountry.code === country.code && 'modern-dropdown-item-selected',
                    )}
                    style={{ '--stagger-index': index } as React.CSSProperties}
                  >
                    <span className="text-xl mr-3">{country.flag}</span>
                    <span className="flex-1 text-left">{country.name}</span>
                    <span className="text-sm text-muted-foreground font-medium">
                      {country.dial}
                    </span>
                    {selectedCountry.code === country.code && (
                      <Check className="h-5 w-5 ml-2 text-[var(--color-2-nuance-1)] animate-in zoom-in-50" />
                    )}
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Aucun pays trouvé
                  </div>
                )}
              </div>
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
  },
);

PhoneInput.displayName = 'PhoneInput';
