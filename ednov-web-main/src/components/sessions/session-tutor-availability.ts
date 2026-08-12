import { checkTutorAvailability, type TutorAvailabilityResult } from '@/services/sessions.service';
import type { UserWithProfile } from '@/types/user.types';

export type TutorSlotAvailabilityStatus = 'unknown' | 'checking' | 'available' | 'conflict';

export type TutorAvailabilityEntry = {
  status: TutorSlotAvailabilityStatus;
  conflictingSession?: TutorAvailabilityResult['conflictingSession'];
};

export type SessionSlot = {
  sessionDate: string;
  startTime: string;
  endTime: string;
};

export type TutorAvailabilityById = Record<string, TutorAvailabilityEntry>;

export function isSessionSlotComplete(slot: SessionSlot): boolean {
  return !!(slot.sessionDate?.trim() && slot.startTime?.trim() && slot.endTime?.trim());
}

export function formatTutorDisplayName(user: UserWithProfile): string {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Tuteur';
}

export function formatConflictHint(
  conflictingSession?: TutorAvailabilityResult['conflictingSession'],
): string | undefined {
  if (!conflictingSession) return undefined;
  const date = conflictingSession.sessionDate;
  const start = conflictingSession.startTime?.slice(0, 5) ?? conflictingSession.startTime;
  const end = conflictingSession.endTime?.slice(0, 5) ?? conflictingSession.endTime;
  return `Déjà en séance en ce créneau horaire`;
}

export function buildSubmitBlockedMessage(unavailable: UserWithProfile[]): string {
  if (unavailable.length === 0) return '';
  const names = unavailable.map(formatTutorDisplayName).join(', ');
  if (unavailable.length === 1) {
    return `Impossible d'enregistrer : ${names} n'est pas disponible à cet horaire. Modifiez le créneau ou retirez ce tuteur.`;
  }
  return `Impossible d'enregistrer : les tuteurs suivants ne sont pas disponibles à cet horaire : ${names}. Modifiez le créneau ou retirez-les.`;
}

export function buildSoftHintMessage(conflictCount: number, isChecking: boolean): string | null {
  if (isChecking) {
    return 'Vérification de la disponibilité des tuteurs…';
  }
  if (conflictCount === 1) {
    return '1 tuteur n\u2019est pas disponible à cet horaire. La séance ne pourra pas être enregistrée tant que le conflit persiste.';
  }
  if (conflictCount > 1) {
    return `${conflictCount} tuteurs ne sont pas disponibles à cet horaire. La séance ne pourra pas être enregistrée tant que les conflits persistent.`;
  }
  return null;
}

export async function checkOneTutorSlotAvailability(
  tutorId: string,
  slot: SessionSlot,
  excludeSessionId?: string,
): Promise<TutorAvailabilityEntry> {
  try {
    const result = await checkTutorAvailability({
      tutorId,
      sessionDate: slot.sessionDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      excludeSessionId,
    });
    return result.available
      ? { status: 'available' }
      : { status: 'conflict', conflictingSession: result.conflictingSession };
  } catch {
    return { status: 'unknown' };
  }
}

export async function checkTutorsSlotAvailability(
  tutors: UserWithProfile[],
  slot: SessionSlot,
  excludeSessionId?: string,
): Promise<TutorAvailabilityById> {
  const entries = await Promise.all(
    tutors.map(async (tutor) => {
      const entry = await checkOneTutorSlotAvailability(tutor.id, slot, excludeSessionId);
      return [tutor.id, entry] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function getUnavailableTutors(
  tutors: UserWithProfile[],
  availabilityById: TutorAvailabilityById,
): UserWithProfile[] {
  return tutors.filter((t) => availabilityById[t.id]?.status === 'conflict');
}

export function countConflicts(availabilityById: TutorAvailabilityById): number {
  return Object.values(availabilityById).filter((e) => e.status === 'conflict').length;
}

/** Vérifie qu'un tuteur peut être ajouté (créneau, limite, dispo) — avec toasts. */
export async function ensureTutorAvailableForAdd(params: {
  user: UserWithProfile;
  slot: SessionSlot;
  selectedTutors: UserWithProfile[];
  maxTutors: number | null;
  tutorLimitMessage: (name: string) => string;
  excludeSessionId?: string;
  toast: {
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
}): Promise<boolean> {
  const { user, slot, selectedTutors, maxTutors, tutorLimitMessage, excludeSessionId, toast } =
    params;
  const name = formatTutorDisplayName(user);

  if (!isSessionSlotComplete(slot)) {
    toast.warning(
      'Veuillez sélectionner une date et un créneau horaire avant d\u2019ajouter un tuteur.',
    );
    return false;
  }
  if (maxTutors !== null && selectedTutors.length >= maxTutors) {
    toast.warning(tutorLimitMessage(name));
    return false;
  }
  if (selectedTutors.some((t) => t.id === user.id)) {
    toast.info(`${name} est déjà ajouté(e) comme tuteur.`);
    return false;
  }

  const entry = await checkOneTutorSlotAvailability(user.id, slot, excludeSessionId);
  if (entry.status === 'conflict') {
    toast.warning(`${name} est déjà occupé(e) à cet horaire`);
    return false;
  }
  if (entry.status === 'unknown') {
    toast.warning('Impossible de vérifier la disponibilité du tuteur. Veuillez réessayer.');
    return false;
  }
  return true;
}
