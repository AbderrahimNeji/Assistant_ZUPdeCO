import * as React from 'react';
import { BaseModal } from '@/components/common/modals/BaseModal';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  className?: string;
  hideCloseButton?: boolean;
}

/**
 * @deprecated Use BaseModal from @/components/common/modals instead
 * This component is kept for backward compatibility
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  hideCloseButton = false,
}) => {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size={size}
      className={className}
      hideCloseButton={hideCloseButton}
      closeOnOutsideClick={!hideCloseButton}
      closeOnEscape={!hideCloseButton}
      header={
        title
          ? {
              title,
              titleColor: 'var(--color-1-nuance-1)',
              titleSize: 'lg',
              titleWeight: 'semibold',
            }
          : undefined
      }
      description={description}
      footer={footer}
    >
      {children}
    </BaseModal>
  );
};
