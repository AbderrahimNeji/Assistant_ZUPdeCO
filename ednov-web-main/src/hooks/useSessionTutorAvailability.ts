import * as React from 'react';
import type { UserWithProfile } from '@/types/user.types';
import {
  buildSoftHintMessage,
  checkTutorsSlotAvailability,
  countConflicts,
  getUnavailableTutors,
  isSessionSlotComplete,
  type SessionSlot,
  type TutorAvailabilityById,
  type TutorAvailabilityEntry,
} from '@/components/sessions/session-tutor-availability';

const DEBOUNCE_MS = 400;

export interface UseSessionTutorAvailabilityOptions {
  tutors: UserWithProfile[];
  slot: SessionSlot;
  excludeSessionId?: string;
  enabled?: boolean;
}

export function useSessionTutorAvailability({
  tutors,
  slot,
  excludeSessionId,
  enabled = true,
}: UseSessionTutorAvailabilityOptions) {
  const [availabilityById, setAvailabilityById] = React.useState<TutorAvailabilityById>({});
  const [isChecking, setIsChecking] = React.useState(false);
  const checkGenerationRef = React.useRef(0);

  const slotComplete = isSessionSlotComplete(slot);
  const tutorIdsKey = tutors.map((t) => t.id).join(',');
  const slotKey = `${slot.sessionDate}|${slot.startTime}|${slot.endTime}`;

  React.useEffect(() => {
    if (!enabled || !slotComplete || tutors.length === 0) {
      setAvailabilityById({});
      setIsChecking(false);
      return;
    }

    const generation = ++checkGenerationRef.current;
    setIsChecking(true);

    // Marquer tous les tuteurs en cours de vérification
    setAvailabilityById((prev) => {
      const next: TutorAvailabilityById = { ...prev };
      for (const tutor of tutors) {
        next[tutor.id] = { status: 'checking' };
      }
      return next;
    });

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkTutorsSlotAvailability(tutors, slot, excludeSessionId);
        if (checkGenerationRef.current !== generation) return;
        setAvailabilityById(result);
      } finally {
        if (checkGenerationRef.current === generation) {
          setIsChecking(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, slotComplete, tutorIdsKey, slotKey, excludeSessionId, tutors, slot]);

  const conflictCount = React.useMemo(() => countConflicts(availabilityById), [availabilityById]);

  const hasConflicts = conflictCount > 0;

  const softHint = React.useMemo(() => {
    if (!enabled || !slotComplete || tutors.length === 0) return null;
    return buildSoftHintMessage(conflictCount, isChecking);
  }, [enabled, slotComplete, tutors.length, conflictCount, isChecking]);

  const validateForSubmit = React.useCallback(async (): Promise<
    { ok: true } | { ok: false; unavailable: UserWithProfile[] }
  > => {
    if (!slotComplete || tutors.length === 0) {
      return { ok: true };
    }

    const fresh = await checkTutorsSlotAvailability(tutors, slot, excludeSessionId);
    setAvailabilityById(fresh);

    const unavailable = getUnavailableTutors(tutors, fresh);
    if (unavailable.length > 0) {
      return { ok: false, unavailable };
    }
    return { ok: true };
  }, [slotComplete, tutors, slot, excludeSessionId]);

  const getEntry = React.useCallback(
    (tutorId: string): TutorAvailabilityEntry | undefined => availabilityById[tutorId],
    [availabilityById],
  );

  return {
    availabilityById,
    isChecking,
    hasConflicts,
    conflictCount,
    softHint,
    slotComplete,
    validateForSubmit,
    getEntry,
  };
}
