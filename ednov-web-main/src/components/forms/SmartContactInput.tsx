import * as React from 'react';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { Mail } from 'lucide-react';
import { detectIdentifierType } from '@/utils/validation';
import { COUNTRY_CODE_MAP, resolveStoredContact } from '@/utils/phone-contact-utils';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ContactMode = 'initial' | 'email' | 'phone';
type ContactType = 'email' | 'phone' | 'unknown';

interface SmartContactInputProps {
  value: string;
  onContactChange: (value: string, type: ContactType, phoneCountryCode?: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  labelTooltip?: string;
  error?: string;
  state?: 'default' | 'error' | 'success' | 'warning';
  helperText?: string;
  // Pour edit : pré-initialiser depuis la valeur DB brute (E.164 ou email)
  initialStoredEmail?: string | null;
  initialStoredPhone?: string | null;
}

export const SmartContactInput: React.FC<SmartContactInputProps> = ({
  value,
  onContactChange,
  onBlur,
  disabled = false,
  required = false,
  label = 'Contact',
  labelTooltip,
  error,
  state,
  helperText,
  initialStoredEmail,
  initialStoredPhone,
}) => {
  const defaultCountry = useDefaultPhoneCountry();

  // Calcul synchrone de l'état initial pour les formulaires d'édition (disabled + valeurs fournies)
  // Évite le flash "Email ou téléphone" avant que le useEffect s'exécute
  const _resolvedOnMount =
    disabled && (initialStoredEmail || initialStoredPhone)
      ? resolveStoredContact(initialStoredEmail ?? null, initialStoredPhone ?? null)
      : null;

  const [mode, setMode] = React.useState<ContactMode>(
    _resolvedOnMount ? (_resolvedOnMount.mode as ContactMode) : 'initial',
  );
  const [detectedCountry, setDetectedCountry] = React.useState<string>(
    _resolvedOnMount ? _resolvedOnMount.isoCode : defaultCountry,
  );
  const [internalDisplayValue, setInternalDisplayValue] = React.useState<string>(
    _resolvedOnMount ? _resolvedOnMount.displayValue : '',
  );

  // Refs pour auto-focus après switch de mode (évite le curseur qui saute)
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  // Track le mode précédent pour distinguer switch utilisateur vs init (initialisé au même mode que l'état)
  const prevMode = React.useRef<ContactMode>(
    _resolvedOnMount ? (_resolvedOnMount.mode as ContactMode) : 'initial',
  );

  const sortedDialCodes = React.useMemo(() => {
    return Object.keys(COUNTRY_CODE_MAP).sort((a, b) => b.length - a.length);
  }, []);

  // Auto-focus uniquement sur switch déclenché par l'utilisateur (pas à l'init)
  React.useEffect(() => {
    if (mode !== prevMode.current) {
      prevMode.current = mode;
      if (mode === 'phone') {
        phoneInputRef.current?.focus();
      } else if (mode === 'email') {
        emailInputRef.current?.focus();
      }
    }
  }, [mode]);

  // Initialisation pour les formulaires d'édition
  React.useEffect(() => {
    if (disabled && (initialStoredEmail || initialStoredPhone)) {
      const resolved = resolveStoredContact(initialStoredEmail, initialStoredPhone);
      // Mettre à jour prevMode AVANT setMode pour que l'effet focus ne se déclenche pas
      prevMode.current = resolved.mode as ContactMode;
      setMode(resolved.mode as ContactMode);
      setDetectedCountry(resolved.isoCode);
      setInternalDisplayValue(resolved.displayValue);
      onContactChange(resolved.displayValue, resolved.mode, resolved.isoCode);
    }
  }, [disabled, initialStoredEmail, initialStoredPhone]);

  const handleInitialInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Détection de l'indicatif international (ex: +33, +216, ...)
    if (inputValue.startsWith('+')) {
      const afterPlus = inputValue.slice(1);
      for (const dialCode of sortedDialCodes) {
        if (afterPlus.startsWith(dialCode)) {
          const remaining = afterPlus.slice(dialCode.length).replace(/^\s+/, '');
          setDetectedCountry(COUNTRY_CODE_MAP[dialCode]);
          setMode('phone');
          onContactChange(remaining, 'phone', COUNTRY_CODE_MAP[dialCode]);
          return;
        }
      }
    }

    const detectedType = detectIdentifierType(inputValue);

    if (detectedType === 'email') {
      setMode('email');
      onContactChange(inputValue, 'email');
    } else if (detectedType === 'phone') {
      setMode('phone');
      setDetectedCountry(defaultCountry);
      onContactChange(inputValue, 'phone', defaultCountry);
    } else {
      setMode('initial');
      onContactChange(inputValue, 'unknown');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Si le '@' disparaît, on quitte le mode email et on re-détecte
    if (!inputValue.includes('@')) {
      const detectedType = detectIdentifierType(inputValue);
      if (detectedType === 'phone') {
        setMode('phone');
        setDetectedCountry(defaultCountry);
        onContactChange(inputValue, 'phone', defaultCountry);
      } else {
        setMode('initial');
        onContactChange(inputValue, 'unknown');
      }
      return;
    }

    onContactChange(inputValue, 'email');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onContactChange(e.target.value, 'phone', detectedCountry);
  };

  const handlePhoneCountryChange = (country: { code: string }) => {
    setDetectedCountry(country.code);
    onContactChange(value, 'phone', country.code);
  };

  const fieldContent =
    mode === 'phone' ? (
      <PhoneInput
        ref={phoneInputRef}
        label={label}
        labelTooltip={labelTooltip}
        value={disabled ? internalDisplayValue : value}
        onChange={handlePhoneChange}
        onBlur={onBlur}
        onCountryChange={handlePhoneCountryChange}
        countryCode={detectedCountry}
        disabled={disabled}
        required={required}
        error={error}
        state={state}
        helperText={helperText}
      />
    ) : mode === 'email' ? (
      <Input
        ref={emailInputRef}
        type="text"
        label={label}
        labelTooltip={labelTooltip}
        value={disabled ? internalDisplayValue : value}
        onChange={handleEmailChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder="Ex: marie.martin@example.com"
        icon={Mail}
        error={error}
        state={state}
        helperText={helperText}
      />
    ) : (
      <Input
        type="text"
        label={label}
        labelTooltip={labelTooltip}
        value={disabled ? internalDisplayValue : value}
        onChange={handleInitialInputChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder="Email ou téléphone"
        error={error}
        state={state}
        helperText={
          helperText ??
          "Saisissez un email ou un numéro de téléphone — le champ s'adaptera automatiquement."
        }
      />
    );

  if (disabled && labelTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full cursor-not-allowed">{fieldContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{labelTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return fieldContent;
};
