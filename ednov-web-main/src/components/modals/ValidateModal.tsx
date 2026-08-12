import * as React from 'react';
import { ConfirmModal } from './ConfirmModal';

interface ValidateModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  variant?: 'primary' | 'warning';
}

export const ValidateModal: React.FC<ValidateModalProps> = ({
  open,
  onClose,
  onConfirm,
  itemName = 'cet élément',
  isLoading = false,
  title = 'Confirmer la validation',
  description,
  confirmText = 'Valider',
  variant = 'primary',
}) => {
  const defaultDescription = `Êtes-vous sûr de vouloir valider ${itemName} ? Cette action marquera le compte rendu comme validé.`;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description || defaultDescription}
      confirmText={confirmText}
      cancelText="Annuler"
      variant={variant}
      isLoading={isLoading}
    />
  );
};
