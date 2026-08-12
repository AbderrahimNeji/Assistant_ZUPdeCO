import * as React from 'react';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { isValidEmail } from '@/utils/validation';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';

interface ResetPasswordFormProps {
  email: string;
  isLoading: boolean;
  emailTouched: boolean;
  error?: string;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onBackToLogin: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  isLoading,
  emailTouched,
  error,
  onEmailChange,
  onEmailBlur,
  onSubmit,
  onBackToLogin,
}) => {
  return (
    <div className="reset-view">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="absolute inset-0 opacity-20 blur-xl rounded-full login-reset-key-blur" />
            <div className="relative p-3 rounded-full login-reset-key-badge">
              <KeyRound className="h-6 w-6 login-reset-key-icon" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mot de passe oublié ?</h1>
            <p className="text-sm text-muted-foreground">Réinitialisez votre mot de passe</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot
          de passe.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <Input
            type="email"
            label="Adresse email"
            placeholder="exemple@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={onEmailBlur}
            error={
              error ||
              (emailTouched && !email.trim()
                ? 'Ce champ est obligatoire'
                : emailTouched && !isValidEmail(email)
                  ? 'Email invalide'
                  : undefined)
            }
            icon={Mail}
            iconPosition="left"
            state={
              emailTouched && email.trim() && isValidEmail(email)
                ? 'success'
                : emailTouched && (!email.trim() || !isValidEmail(email))
                  ? 'error'
                  : 'default'
            }
            disabled={isLoading}
            required
            autoFocus
          />

          <div className="space-y-3">
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading || !email.trim() || !isValidEmail(email)}
              fullWidth
              variant="primary"
              size="lg"
            >
              Envoyer le lien
            </Button>

            <Button type="button" onClick={onBackToLogin} fullWidth variant="ghost" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au login
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
