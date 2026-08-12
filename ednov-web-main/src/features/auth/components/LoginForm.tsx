import * as React from 'react';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { Button } from '@/components/forms/Button';
import { Checkbox } from '@/components/forms/Checkbox';
import { type LoginMode } from '@/hooks/useLogin';
import { isValidEmail } from '@/utils/validation';
import { COUNTRY_CODE_MAP } from '@/utils/phone-contact-utils';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { Mail, Lock, Phone, type LucideIcon } from 'lucide-react';

interface LoginFormProps {
  logo?: string;
  mode: LoginMode;
  identifier: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  identifierTouched: boolean;
  passwordTouched: boolean;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onIdentifierBlur: () => void;
  onPasswordBlur: () => void;
  onSubmit: React.SubmitEventHandler<HTMLFormElement>;
  onForgotPassword: () => void;
  onSwitchToPhone: (phoneNumber: string) => void;
}

const getIconForMode = (mode: LoginMode): LucideIcon | undefined => {
  if (mode === 'email') return Mail;
  if (mode === 'phone') return Phone;
  return undefined;
};

const getPasswordState = (password: string, touched: boolean): 'default' | 'error' | 'success' => {
  if (!touched) return 'default';
  if (!password || password.length < 6) return 'error';
  return 'success';
};

const getIdentifierState = (
  mode: LoginMode,
  identifier: string,
  touched: boolean,
): 'default' | 'error' | 'success' => {
  if (!touched) return 'default';
  if (!identifier.trim()) return 'error';
  if (mode === 'email' && !isValidEmail(identifier)) return 'error';
  if (mode === 'phone' && identifier.length < 10) return 'error';
  return 'success';
};

export const LoginForm: React.FC<LoginFormProps> = ({
  logo,
  mode,
  identifier,
  password,
  rememberMe,
  isLoading,
  identifierTouched,
  passwordTouched,
  onIdentifierChange,
  onPasswordChange,
  onRememberMeChange,
  onIdentifierBlur,
  onPasswordBlur,
  onSubmit,
  onForgotPassword,
  onSwitchToPhone,
}) => {
  const defaultCountry = useDefaultPhoneCountry();
  const [detectedCountry, setDetectedCountry] = React.useState<string>(defaultCountry);

  const sortedDialCodes = React.useMemo(
    () => Object.keys(COUNTRY_CODE_MAP).sort((a, b) => b.length - a.length),
    [],
  );

  const handleInitialIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value.startsWith('+')) {
      const afterPlus = value.slice(1);
      for (const dialCode of sortedDialCodes) {
        if (afterPlus.startsWith(dialCode)) {
          // Indicatif reconnu : basculer en mode phone avec le bon pays
          const remaining = afterPlus.slice(dialCode.length).replace(/^\s+/, '');
          setDetectedCountry(COUNTRY_CODE_MAP[dialCode]);
          onSwitchToPhone(remaining);
          return;
        }
      }
    }

    onIdentifierChange(value);
  };

  const getIdentifierError = () => {
    if (!identifierTouched) return undefined;
    if (!identifier.trim()) return 'Ce champ est obligatoire';
    if (mode === 'email' && !isValidEmail(identifier)) return 'Email invalide';
    return undefined;
  };

  return (
    <div className="login-view">
      {logo && (
        <div className="login-logo-container">
          <img src={logo} alt="Logo ZUPdeCO" className="login-logo-main" />
        </div>
      )}
      <h1 className="login-card-title">Bienvenue</h1>
      <p className="login-card-subtitle">Connectez-vous pour accéder à votre espace</p>

      <form onSubmit={onSubmit} className="login-form">
        <div className="login-field">
          {mode === 'phone' ? (
            <PhoneInput
              label="Numéro de téléphone"
              value={identifier}
              onChange={(e) => onIdentifierChange(e.target.value)}
              onBlur={onIdentifierBlur}
              countryCode={detectedCountry}
              disabled={isLoading}
              required
              autoFocus
            />
          ) : (
            <Input
              type="text"
              label="Email ou téléphone"
              placeholder="Veuillez saisir votre email ou téléphone"
              value={identifier}
              onChange={handleInitialIdentifierChange}
              onBlur={onIdentifierBlur}
              icon={getIconForMode(mode)}
              iconPosition="left"
              state={getIdentifierState(mode, identifier, identifierTouched)}
              error={getIdentifierError()}
              disabled={isLoading}
              required
              autoFocus
            />
          )}
        </div>

        {mode === 'email' && (
          <>
            <div className="login-field input-morph">
              <Input
                type="password"
                label="Mot de passe"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onBlur={onPasswordBlur}
                icon={Lock}
                iconPosition="left"
                state={getPasswordState(password, passwordTouched)}
                error={
                  passwordTouched && (!password || password.length < 6)
                    ? 'Le mot de passe doit contenir au moins 6 caractères'
                    : undefined
                }
                disabled={isLoading}
                required
                showPasswordToggle
              />
            </div>

            <div className="flex items-center justify-between">
              <Checkbox
                label="Rester connecté"
                checked={rememberMe}
                onCheckedChange={onRememberMeChange}
                disabled={isLoading}
              />

              <button type="button" onClick={onForgotPassword} className="forgot-password-link">
                Mot de passe oublié ?
              </button>
            </div>
          </>
        )}

        {mode === 'phone' && (
          <div className="flex justify-start">
            <Checkbox
              label="Rester connecté"
              checked={rememberMe}
              onCheckedChange={onRememberMeChange}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="login-field">
          <Button
            type="submit"
            loading={isLoading}
            disabled={
              isLoading || mode === 'initial' || !identifier || (mode === 'email' && !password)
            }
            fullWidth
            variant="primary"
            size="lg"
            className="login-button"
          >
            {mode === 'phone' ? 'Envoyer le code' : 'Se connecter'}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="login-footer-legal">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </form>
    </div>
  );
};
