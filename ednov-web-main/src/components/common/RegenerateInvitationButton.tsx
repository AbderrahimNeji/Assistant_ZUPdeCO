import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { MailWarning, Send } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { toast } from '@/lib/toast';
import { regenerateInvitation } from '@/services/users.service';

interface RegenerateInvitationButtonProps {
  userId: string;
  /** Primary contact email; the action is only available for email invites. */
  email?: string | null;
  /**
   * Computed by the backend detail endpoints (Firebase-backed). True only while an email-invited
   * account has not completed activation. The button is permanently hidden once activated.
   */
  pendingActivation?: boolean;
}

/**
 * "Régénérer le lien d'activation" — visible only while the account is pending activation and the
 * user was invited by email. Sends a fresh 14-day activation email via the backend. Once the
 * account is activated, this button is no longer rendered.
 */
export const RegenerateInvitationButton: React.FC<RegenerateInvitationButtonProps> = ({
  userId,
  email,
  pendingActivation,
}) => {
  const mutation = useMutation({
    mutationFn: () => regenerateInvitation(userId),
    onSuccess: () => {
      toast.success("Un nouveau lien d'activation a été envoyé par email.");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Erreur lors de l'envoi du lien d'activation");
    },
  });

  // Permanently hidden once activated, or when there is no email (phone invite).
  if (!pendingActivation || !email) {
    return null;
  }

  return (
    <div className="form-section">
      <h4 className="form-section-title">
        <MailWarning className="w-4 h-4" />
        Activation du compte
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        Ce compte n'a pas encore été activé. Le lien d'activation expire après un délai limité. S'il
        a expiré, vous pouvez en envoyer un nouveau à <strong>{email}</strong>.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="md"
        icon={Send}
        loading={mutation.isPending}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Régénérer le lien d'activation
      </Button>
    </div>
  );
};
