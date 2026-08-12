import type { SessionType } from './entities/session.entity';

export type SessionPairInput = {
  studentUserId: string;
  tutorUserId: string;
};

/**
 * Builds tutor–student pairs for session creation.
 * - Explicit `pairs` in the DTO take precedence (deduped by student+tutor).
 * - Otherwise: cartesian product of studentIds × tutorIds (all session types).
 */
export function deriveSessionPairsFromCreateInput(
  _sessionType: SessionType,
  tutorIds: string[],
  studentIds: string[],
  explicitPairs?: SessionPairInput[],
): SessionPairInput[] {
  if (explicitPairs?.length) {
    const seen = new Set<string>();
    const result: SessionPairInput[] = [];
    for (const p of explicitPairs) {
      const key = `${p.studentUserId}:${p.tutorUserId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
    }
    return result;
  }

  if (tutorIds.length === 0 || studentIds.length === 0) {
    return [];
  }

  const pairs: SessionPairInput[] = [];
  for (const studentUserId of studentIds) {
    for (const tutorUserId of tutorIds) {
      pairs.push({ studentUserId, tutorUserId });
    }
  }
  return pairs;
}

/** Returns an error message when pairs violate type-specific rules; null if valid. */
export function validatePairsForSessionType(
  sessionType: SessionType,
  pairs: SessionPairInput[],
): string | null {
  if (sessionType === 'whole_class') {
    return null;
  }
  const seenStudents = new Set<string>();
  for (const p of pairs) {
    if (seenStudents.has(p.studentUserId)) {
      return `Chaque élève ne peut être associé qu'à un seul tuteur pour ce type de séance (${sessionType}).`;
    }
    seenStudents.add(p.studentUserId);
  }
  return null;
}
