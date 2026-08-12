import * as React from 'react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const icons = {
    danger: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    primary: Info,
  };

  const iconColors = {
    danger: 'rgb(239, 68, 68)',
    warning: 'var(--color-3-nuance-1)',
    info: 'var(--color-2-nuance-1)',
    primary: 'var(--color-1-nuance-1)',
  };

  const iconBgColors = {
    danger: 'rgb(239, 68, 68, 0.1)',
    warning: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
    info: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
    primary: 'color-mix(in srgb, var(--color-1-nuance-1) 15%, transparent)',
  };

  const Icon = icons[variant];

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="md"
      header={{
        icon: Icon,
        iconColor: iconColors[variant],
        iconBgColor: iconBgColors[variant],
        iconSize: 'md',
        title,
        titleColor: 'var(--foreground)',
        titleSize: 'lg',
        titleWeight: 'semibold',
      }}
      description={description}
      hideContentWrapper={true}
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button preset="modal-cancel" onClick={onClose} disabled={isProcessing || isLoading}>
            {cancelText}
          </Button>
          <Button
            preset={variant === 'danger' ? 'modal-danger' : 'modal-confirm'}
            onClick={handleConfirm}
            loading={isProcessing || isLoading}
            disabled={isProcessing || isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div />
    </BaseModal>
  );
};
