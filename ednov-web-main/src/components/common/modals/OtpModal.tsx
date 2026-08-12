import * as React from 'react';
import { BaseModal } from './BaseModal';
import { OtpInput } from '@/components/forms/OtpInput';
import { Button } from '@/components/forms/Button';
import { AlertCircle, Shield } from 'lucide-react';

interface OtpModalProps {
  open: boolean;
  onClose: () => void;
  onVerify: (_code: string) => Promise<void>;
  onResend: () => Promise<void>;
  phoneNumber: string;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  open,
  onClose,
  onVerify,
  onResend,
  phoneNumber,
}) => {
  const [otpValue, setOtpValue] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(60);
  const [localError, setLocalError] = React.useState<string | undefined>();

  // Countdown timer
  React.useEffect(() => {
    if (!open) {
      setCountdown(60);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, open]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setOtpValue('');
      setLocalError(undefined);
      setCountdown(60);
    }
  }, [open]);

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      setLocalError('Veuillez saisir le code complet');
      return;
    }

    setIsVerifying(true);
    setLocalError(undefined);

    try {
      await onVerify(otpValue);
      // Modal will be closed by parent component on success
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setLocalError(undefined);
    setOtpValue('');

    try {
      await onResend();
      setCountdown(60);
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpComplete = (code: string) => {
    setOtpValue(code);
    // Auto-submit when all 6 digits are entered
    if (code.length === 6) {
      handleVerify();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Mask middle digits for privacy
    if (phone.length > 6) {
      return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
    }
    return phone;
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="md"
      hideCloseButton={isVerifying}
      closeOnOutsideClick={!isVerifying}
      closeOnEscape={!isVerifying}
      header={{
        icon: Shield,
        iconColor: 'var(--color-2-nuance-1)',
        iconBgColor: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
        iconSize: 'md',
        title: 'Vérification du code',
        titleSize: 'lg',
        titleWeight: 'bold',
        titleColor: 'var(--foreground)',
      }}
    >
      <div className="space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-sm text-muted-foreground">Un code de vérification a été envoyé au</p>
          <p className="text-base font-semibold text-[var(--color-1-nuance-1)]">
            {formatPhoneNumber(phoneNumber)}
          </p>
        </div>

        <div className="space-y-4">
          <OtpInput
            value={otpValue}
            onChange={setOtpValue}
            onComplete={handleOtpComplete}
            error={!!localError}
            disabled={isVerifying}
          />

          {localError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{localError}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleVerify}
            loading={isVerifying}
            disabled={otpValue.length !== 6 || isVerifying}
            fullWidth
            variant="primary"
          >
            Vérifier le code
          </Button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Renvoyer le code dans{' '}
                <span className="font-semibold text-[var(--color-2-nuance-1)]">{countdown}s</span>
              </p>
            ) : (
              <Button
                onClick={handleResend}
                loading={isResending}
                disabled={isResending}
                variant="ghost"
                size="sm"
              >
                Renvoyer le code
              </Button>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Vous n'avez pas reçu le code ? Vérifiez votre numéro de téléphone.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
