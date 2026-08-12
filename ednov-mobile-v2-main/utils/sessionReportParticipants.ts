import type { AttendanceStatus, SessionParticipant } from '@/types/session';

import { resolveDraftForParticipant } from '@/utils/absenceDraft';

export type SessionReportParticipantAttendanceItem = {
  participantId: string;
  attendanceStatus: AttendanceStatus;
  absenceJustification?: string | null;
  absenceComment?: string | null;
};

/** Fusionne les participants serveur avec les brouillons locaux (motif / commentaire). */
export function mergeParticipantsWithAbsenceDrafts(
  participants: SessionParticipant[],
  selectedMotif: Record<string, string>,
  commentaire: Record<string, string>,
): SessionParticipant[] {
  return participants.map((p) => {
    if (p.attendanceStatus === 'present') {
      return {
        ...p,
        absenceJustification: undefined,
        absenceComment: undefined,
      };
    }

    const draft = resolveDraftForParticipant(p, selectedMotif, commentaire);
    if (draft.motif.trim()) {
      return {
        ...p,
        attendanceStatus: 'absent',
        absenceJustification: draft.motif.trim(),
        absenceComment: draft.comment.trim(),
      };
    }

    return p;
  });
}

/** Payload `participants` pour PATCH/POST session report (aligné web). */
export function buildSessionReportParticipantsPayload(
  participants: SessionParticipant[],
): SessionReportParticipantAttendanceItem[] {
  return participants.map((p) => {
    const status = p.attendanceStatus ?? 'pending';
    if (status === 'absent') {
      return {
        participantId: p.id,
        attendanceStatus: status,
        absenceJustification: (p.absenceJustification ?? '').trim() || null,
        absenceComment: (p.absenceComment ?? '').trim() || null,
      };
    }
    return {
      participantId: p.id,
      attendanceStatus: status,
      absenceJustification: null,
      absenceComment: null,
    };
  });
}
