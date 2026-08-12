import * as React from 'react';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { isValidEmail, validatePassword } from '@/utils/validation';
import { Mail, Lock, Check, X } from 'lucide-react';

interface SetupPasswordFormProps {
  logo?: string;
  email: string;
  password: string;
  confirmPassword: string;
  emailTouched: boolean;
  passwordTouched: boolean;
  confirmPasswordTouched: boolean;
  isLoading: boolean;
  error?: string;
  isEmailDisabled: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordBlur: () => void;
  onConfirmPasswordBlur: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export const SetupPasswordForm: React.FC<SetupPasswordFormProps> = ({
  logo,
  email,
  password,
  confirmPassword,
  emailTouched,
  passwordTouched,
  confirmPasswordTouched,
  isLoading,
  error,
  isEmailDisabled,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onEmailBlur,
  onPasswordBlur,
  onConfirmPasswordBlur,
  onSubmit,
}) => {
  const passwordValidation = validatePassword(password);

  return (
    <div className="setup-password-view">
      {logo && (
        <div className="login-logo-container">
          <img src={logo} alt="Logo ZUPdeCO" className="login-logo-main" />
        </div>
      )}
      <h1 className="login-card-title">Définissez votre mot de passe</h1>
      <p className="login-card-subtitle">Créez un mot de passe sécurisé pour votre compte</p>

      <form onSubmit={onSubmit} className="login-form">
        <div className="login-field">
          <Input
            type="email"
            label="Adresse email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={onEmailBlur}
            icon={Mail}
            iconPosition="left"
            state={
              emailTouched && email.trim() && isValidEmail(email)
                ? 'success'
                : emailTouched && (!email.trim() || !isValidEmail(email))
                  ? 'error'
                  : 'default'
            }
            error={
              emailTouched && !email.trim()
                ? 'Ce champ est obligatoire'
                : emailTouched && !isValidEmail(email)
                  ? 'Email invalide'
                  : undefined
            }
            disabled={isEmailDisabled || isLoading}
            required
            autoFocus={!isEmailDisabled}
          />
        </div>

        <div className="login-field">
          <Input
            type="password"
            label="Mot de passe"
            placeholder="Créez un mot de passe"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onBlur={onPasswordBlur}
            icon={Lock}
            iconPosition="left"
            state={
              passwordTouched && passwordValidation.valid
                ? 'success'
                : passwordTouched && !passwordValidation.valid
                  ? 'error'
                  : 'default'
            }
            error={
              passwordTouched && !passwordValidation.valid
                ? 'Le mot de passe ne respecte pas tous les critères'
                : undefined
            }
            disabled={isLoading}
            required
            autoFocus={isEmailDisabled}
            showPasswordToggle
          />

          {passwordTouched && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Critères de sécurité :</p>
              {passwordValidation.rules.map((rule) => (
                <div
                  key={rule.key}
                  className="flex items-center gap-2 text-sm"
                  style={{
                    color: rule.valid ? 'var(--color-success)' : 'var(--color-muted-foreground)',
                  }}
                >
                  {rule.valid ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="login-field">
          <Input
            type="password"
            label="Confirmer le mot de passe"
            placeholder="Confirmez votre mot de passe"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            onBlur={onConfirmPasswordBlur}
            icon={Lock}
            iconPosition="left"
            state={
              confirmPasswordTouched && confirmPassword === password && passwordValidation.valid
                ? 'success'
                : confirmPasswordTouched &&
                    (confirmPassword !== password || !passwordValidation.valid)
                  ? 'error'
                  : 'default'
            }
            error={
              error ||
              (confirmPasswordTouched && confirmPassword !== password
                ? 'Les mots de passe ne correspondent pas'
                : confirmPasswordTouched && !passwordValidation.valid
                  ? 'Le mot de passe ne respecte pas tous les critères'
                  : undefined)
            }
            disabled={isLoading}
            required
            showPasswordToggle
          />
        </div>

        <div className="login-field">
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading || !email || !password || !confirmPassword}
            fullWidth
            variant="primary"
            size="lg"
            className="login-button"
          >
            Activer mon compte
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="login-footer-legal">
            En activant votre compte, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </form>
    </div>
  );
};
