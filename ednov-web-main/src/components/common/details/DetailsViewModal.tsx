import * as React from 'react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { cn } from '@/lib/utils';

interface DetailsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const DetailsViewModal: React.FC<DetailsViewModalProps> = ({
  isOpen,
  onClose,
  children,
  size = '2xl',
  className,
}) => {
  return (
    <BaseModal
      open={isOpen}
      onClose={onClose}
      size={size}
      className={cn('details-view-modal', className)}
      closeOnOutsideClick={true}
      closeOnEscape={true}
      compactPadding={true}
    >
      {children}
    </BaseModal>
  );
};
