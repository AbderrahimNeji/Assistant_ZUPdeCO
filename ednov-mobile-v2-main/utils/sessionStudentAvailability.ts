import {
  checkStudentAvailability,
  type StudentAvailabilityResult,
} from '@/services/sessions';

/** Créneau d'une séance (aligné web SessionSlot). */
export type SessionSlot = {
  sessionDate: string;
  startTime: string;
  endTime: string;
};

export type StudentSlotAvailabilityStatus = 'checking' | 'available' | 'conflict' | 'unknown';

export type StudentAvailabilityEntry = {
  status: StudentSlotAvailabilityStatus;
  hint?: string;
};

export type StudentAvailabilityById = Record<string, StudentAvailabilityEntry>;

export function isSessionSlotComplete(slot: SessionSlot | null | undefined): slot is SessionSlot {
  return !!(slot?.sessionDate?.trim() && slot.startTime?.trim() && slot.endTime?.trim());
}

/** Extrait le créneau depuis la Session mobile (`date` = sessionDate + 'T' + startTime). */
export function slotFromSession(session: {
  date?: string | null;
  endTime?: string | null;
}): SessionSlot | null {
  const date = (session.date ?? '').trim();
  const tIndex = date.indexOf('T');
  if (tIndex <= 0) return null;
  const sessionDate = date.slice(0, tIndex);
  const startTime = date.slice(tIndex + 1);
  const endTime = (session.endTime ?? '').trim();
  if (!sessionDate || !startTime || !endTime) return null;
  return { sessionDate, startTime, endTime };
}

/** Aligné web formatConflictHint. */
export function formatConflictHint(
  conflictingSession?: StudentAvailabilityResult['conflictingSession'],
): string {
  if (!conflictingSession) return 'Déjà en séance sur ce créneau horaire.';
  const start = conflictingSession.startTime?.slice(0, 5) || '';
  const end = conflictingSession.endTime?.slice(0, 5) || '';
  if (start && end) return `Déjà en séance de ${start} à ${end} ce jour-là.`;
  if (start) return `Déjà en séance à partir de ${start} ce jour-là.`;
  return 'Déjà en séance sur ce créneau horaire.';
}

/** Vérifie un élève sur le créneau ; ne lève jamais (status 'unknown' en cas d'erreur réseau). */
export async function checkOneStudentSlotAvailability(
  studentId: string,
  slot: SessionSlot,
  excludeSessionId?: string,
): Promise<StudentAvailabilityEntry> {
  try {
    const result = await checkStudentAvailability({
      studentId,
      sessionDate: slot.sessionDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      excludeSessionId,
    });
    return result.available
      ? { status: 'available' }
      : { status: 'conflict', hint: formatConflictHint(result.conflictingSession) };
  } catch {
    return { status: 'unknown' };
  }
}

/** Message bloquant à l'enregistrement (aligné web buildStudentSubmitBlockedMessage). */
export function buildStudentSubmitBlockedMessage(names: string[]): string {
  if (names.length === 0) return '';
  const joined = names.join(', ');
  if (names.length === 1) {
    return `Impossible d'ajouter : ${joined} n'est pas disponible à cet horaire. Retirez cet élève de la sélection.`;
  }
  return `Impossible d'ajouter : les élèves suivants ne sont pas disponibles à cet horaire : ${joined}. Retirez-les de la sélection.`;
}
