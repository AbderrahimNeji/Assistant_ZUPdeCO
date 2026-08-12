import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import {
  getVscWaitForAllTutorsModalDescription,
  shouldShowValidateWaitModal,
  type ValidateWaitOptions,
} from '@/utils/report-author-feedback';
import type { SessionReport } from '@/types/report.types';

interface ReportValidateWaitModalProps {
  open: boolean;
  onClose: () => void;
  /** Valider le compte rendu malgré les tuteurs en attente. */
  onConfirm: () => void;
  report: SessionReport | null | undefined;
  validateOptions?: ValidateWaitOptions;
  isLoading?: boolean;
}

/**
 * Avertit le VSC lorsque tous les tuteurs n’ont pas renseigné le CR (classe entière).
 * Annuler = fermer ; Valider quand même = valider le CR.
 */
export const ReportValidateWaitModal: React.FC<ReportValidateWaitModalProps> = ({
  open,
  onClose,
  onConfirm,
  report,
  validateOptions,
  isLoading = false,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  if (!open || !report || !shouldShowValidateWaitModal(report, validateOptions)) {
    return null;
  }

  const description = getVscWaitForAllTutorsModalDescription(report, validateOptions);
  const paragraphs = description.split('\n\n').filter((p) => p.trim().length > 0);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="md"
      className="report-validate-wait-modal"
      hideContentWrapper
      header={{
        icon: AlertTriangle,
        iconColor: 'var(--color-3-nuance-1)',
        iconBgColor: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
        iconSize: 'md',
        title: 'Compte rendu incomplet',
        titleColor: 'var(--foreground)',
        titleSize: 'lg',
        titleWeight: 'semibold',
      }}
      headerSeparatorClassName="report-validate-wait-modal__header-rule"
      footerSeparatorClassName="report-validate-wait-modal__footer-rule"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button preset="modal-cancel" onClick={onClose} disabled={isProcessing || isLoading}>
            Annuler
          </Button>
          <Button
            preset="modal-confirm"
            onClick={handleConfirm}
            loading={isProcessing || isLoading}
            disabled={isProcessing || isLoading}
          >
            Valider quand même
          </Button>
        </div>
      }
    >
      <div className="report-validate-wait-modal__body">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </BaseModal>
  );
};
