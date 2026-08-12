import * as React from 'react';
import { BaseModal } from './BaseModal';
import { Spinner } from '@/components/ui/spinner';

interface LoadingModalProps {
  open: boolean;
  title?: string;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  open,
  title = 'Chargement...',
  message = 'Veuillez patienter',
  progress,
  showProgress = false,
  size = 'sm',
}) => {
  return (
    <BaseModal
      open={open}
      onClose={() => {}} // Cannot close loading modal
      size={size}
      hideCloseButton={true}
      closeOnOutsideClick={false}
      closeOnEscape={false}
      header={{
        title,
        titleSize: 'md',
        titleWeight: 'semibold',
        titleColor: 'var(--foreground)',
      }}
    >
      <div className="space-y-6 text-center py-4">
        {/* Spinner */}
        <div className="flex justify-center">
          <Spinner variant="default" size="lg" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{message}</p>

          {/* Progress bar */}
          {showProgress && progress !== undefined && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-2-nuance-1)] to-[var(--color-1-nuance-1)] transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
