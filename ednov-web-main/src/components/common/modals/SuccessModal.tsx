import * as React from 'react';
import { BaseModal } from './BaseModal';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  title = 'Succès !',
  message,
  autoClose = false,
  autoCloseDelay = 3000,
  showCloseButton = true,
  closeButtonLabel = 'Fermer',
  size = 'md',
}) => {
  // Auto-close timer
  React.useEffect(() => {
    if (open && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, autoCloseDelay, onClose]);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size={size}
      header={{
        icon: CheckCircle2,
        iconColor: 'rgb(34, 197, 94)',
        iconBgColor: 'rgb(34, 197, 94, 0.15)',
        iconSize: 'lg',
        title,
        titleSize: 'lg',
        titleWeight: 'bold',
        titleColor: 'var(--foreground)',
      }}
      footer={
        showCloseButton ? (
          <Button variant="primary" onClick={onClose} fullWidth>
            {closeButtonLabel}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 text-center animate-fade-in">
        {/* Animated checkmark */}
        <div className="flex justify-center">
          <div className="relative">
            <div className={cn('rounded-full p-4', 'bg-[rgb(34,197,94,0.15)]', 'animate-scale-in')}>
              <CheckCircle2
                className="w-16 h-16 text-[rgb(34,197,94)] animate-pop-in"
                style={{ animationDelay: '100ms' }}
              />
            </div>
            {/* Pulse ring animation */}
            <div
              className="absolute inset-0 rounded-full bg-[rgb(34,197,94,0.2)] animate-ping"
              style={{ animationDuration: '1.5s' }}
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-base text-foreground">{message}</p>

          {autoClose && (
            <p className="text-xs text-muted-foreground">
              Cette fenêtre se fermera automatiquement...
            </p>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
