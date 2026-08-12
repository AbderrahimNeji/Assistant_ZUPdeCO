import * as React from 'react';
import { UserCheck } from 'lucide-react';
import { ParticipantChip } from '@/components/sessions/ParticipantChip';
import type { SessionParticipant } from '@/types/session.types';
interface VscSessionParticipantsBlockProps {
  participants: SessionParticipant[];
  /** `edit` = formulaire CR ; `detail` = lecture seule */
  variant?: 'edit' | 'detail';
}

/**
 * VSC rattachés à la séance sans saisie de présence dans le compte rendu.
 */
export const VscSessionParticipantsBlock: React.FC<VscSessionParticipantsBlockProps> = ({
  participants,
  variant = 'edit',
}) => {
  if (participants.length === 0) return null;

  const title = variant === 'detail' ? 'VSC' : 'VSC présents sur la séance';

  return (
    <div className={variant === 'edit' ? 'form-section' : undefined}>
      <div className="form-section-title">
        <UserCheck className="w-4 h-4" />
        <span>{title}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full border"
          style={{
            background: 'color-mix(in srgb, var(--color-3-nuance-1) 12%, transparent)',
            color: 'var(--color-3-nuance-1)',
            borderColor: 'var(--color-3-nuance-1)',
          }}
        >
          {participants.length}
        </span>
      </div>
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-3-nuance-1)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-3-nuance-1)_6%,transparent)] p-4">
        <p className="text-sm text-muted-foreground mb-3">
          {participants.length === 1
            ? 'Ce VSC participe à la séance. Sa présence n’est pas saisie dans le compte rendu.'
            : 'Ces VSC participent à la séance. Leur présence n’est pas saisie dans le compte rendu.'}
        </p>
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {participants.map((p) => (
            <li key={p.id}>
              <ParticipantChip
                user={p.user}
                role="volunteer"
                volunteerRoleLabel="VSC"
                size="md"
                showTooltip
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
