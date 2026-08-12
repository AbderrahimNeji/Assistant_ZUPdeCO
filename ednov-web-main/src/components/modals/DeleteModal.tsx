import * as React from 'react';
import { ConfirmModal } from './ConfirmModal';

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  variant?: 'danger' | 'warning';
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  open,
  onClose,
  onConfirm,
  itemName = 'cet élément',
  isLoading = false,
  title = 'Confirmer la suppression',
  description,
  confirmText = 'Supprimer',
  variant = 'danger',
}) => {
  const defaultDescription = `Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible.`;

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
