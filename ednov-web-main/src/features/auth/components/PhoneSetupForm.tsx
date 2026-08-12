import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { OtpInput } from '@/components/forms/OtpInput';
import { Shield } from 'lucide-react';

interface PhoneSetupFormProps {
  logo?: string;
  phone: string;
  otpValue: string;
  countdown: number;
  isLoading: boolean;
  error?: string;
  onOtpChange: (value: string) => void;
  onOtpComplete: (code: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onVerify: () => void;
}

export const PhoneSetupForm: React.FC<PhoneSetupFormProps> = ({
  logo,
  phone,
  otpValue,
  countdown,
  isLoading,
  error,
  onOtpChange,
  onOtpComplete,
  onResendOtp,
  onVerify,
}) => {
  return (
    <div className="phone-setup-view">
      {logo && (
        <div className="login-logo-container">
          <img src={logo} alt="Logo ZUPdeCO" className="login-logo-main" />
        </div>
      )}
      <h1 className="login-card-title">Activez votre compte</h1>
      <p className="login-card-subtitle">Un code de vérification a été envoyé au {phone}</p>

      <div className="login-form">
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div
                className="absolute inset-0 opacity-20 blur-xl rounded-full"
                style={{ background: 'var(--color-2-nuance-1)' }}
              />
              <div
                className="relative p-3 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                }}
              >
                <Shield className="h-6 w-6" style={{ color: 'var(--color-2-nuance-1)' }} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Vérification du code</h3>
              <p className="text-sm text-muted-foreground">Saisissez le code à 6 chiffres</p>
            </div>
          </div>

          <OtpInput
            value={otpValue}
            onChange={onOtpChange}
            onComplete={onOtpComplete}
            error={!!error}
            disabled={isLoading}
          />

          {error && <p className="form-error-text text-center">{error}</p>}

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Renvoyer le code dans{' '}
                <span className="font-semibold text-[var(--color-2-nuance-1)]">{countdown}s</span>
              </p>
            ) : (
              <Button
                onClick={onResendOtp}
                loading={isLoading}
                disabled={isLoading}
                variant="ghost"
                size="sm"
              >
                Renvoyer le code
              </Button>
            )}
          </div>
        </div>

        <div className="login-field mt-6">
          <Button
            onClick={onVerify}
            loading={isLoading}
            disabled={otpValue.length !== 6 || isLoading}
            fullWidth
            variant="primary"
            size="lg"
            className="login-button"
          >
            Activer mon compte
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Vous n'avez pas reçu le code ? Vérifiez votre numéro de téléphone.
          </p>
        </div>
      </div>
    </div>
  );
};
