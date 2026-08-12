import type { SessionParticipant } from '@/types/session';
import { filterParticipantsForViewerAssiduity } from '@/types/session';

export const AUTRE_MOTIF = 'Autre';

export function validateParticipantAbsence(participant: SessionParticipant): string | null {
  if (participant.attendanceStatus !== 'absent') return null;

  const justification = (participant.absenceJustification ?? '').trim();
  if (!justification) {
    return "Un motif d'absence est requis";
  }

  return null;
}

export function validateSessionAttendance(
  participants: SessionParticipant[],
): Map<string, string> {
  const errors = new Map<string, string>();
  for (const participant of participants) {
    const error = validateParticipantAbsence(participant);
    if (error) errors.set(participant.id, error);
  }
  return errors;
}

/** Valide uniquement les participants visibles/éditables par l'utilisateur connecté. */
export function validateSessionAttendanceForViewer(
  participants: SessionParticipant[],
  viewerUserId: string | undefined,
): Map<string, string> {
  return validateSessionAttendance(
    filterParticipantsForViewerAssiduity(participants, viewerUserId),
  );
}

export function isSessionAttendanceValid(participants: SessionParticipant[]): boolean {
  return validateSessionAttendance(participants).size === 0;
}
