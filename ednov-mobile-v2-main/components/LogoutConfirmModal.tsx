import React from 'react';

import { ConfirmModal } from '@/components/ConfirmModal';

export type LogoutConfirmModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading: boolean;
  error: string | null;
}>;

export function LogoutConfirmModal({
  visible,
  onClose,
  onConfirm,
  loading,
  error,
}: LogoutConfirmModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="Déconnexion"
      message="Êtes-vous sûr de vouloir vous déconnecter ?"
      confirmLabel="Déconnecter"
      icon="logout"
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      error={error}
      confirmAccessibilityLabel="Confirmer la déconnexion"
      cancelAccessibilityLabel="Annuler la déconnexion"
    />
  );
}
