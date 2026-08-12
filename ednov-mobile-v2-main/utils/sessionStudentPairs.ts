import type { SessionStudentTutorPair, SessionType } from '@/types/session';

/**
 * Build pairs for newly added students on a flat presential session (mirrors web classic rules).
 * - whole_class → each student × all session tutors/volunteers
 * - other types → each student × the tutor who adds them
 */
export function buildPairsForAddedStudents(options: {
  sessionType: SessionType | null | undefined;
  newStudentIds: string[];
  currentTutorId: string;
  facilitatorIds: string[];
}): SessionStudentTutorPair[] {
  const { sessionType, newStudentIds, currentTutorId, facilitatorIds } = options;
  const students = [...new Set(newStudentIds.filter(Boolean))];
  if (students.length === 0) return [];

  if (sessionType === 'whole_class') {
    const tutors = [...new Set(facilitatorIds.filter(Boolean))];
    const targets = tutors.length > 0 ? tutors : currentTutorId ? [currentTutorId] : [];
    const pairs: SessionStudentTutorPair[] = [];
    for (const studentUserId of students) {
      for (const tutorUserId of targets) {
        pairs.push({ studentUserId, tutorUserId });
      }
    }
    return pairs;
  }

  if (!currentTutorId) return [];
  return students.map((studentUserId) => ({
    studentUserId,
    tutorUserId: currentTutorId,
  }));
}

/** Merge existing + new pairs, deduped by student+tutor. */
export function mergeSessionPairs(
  existing: SessionStudentTutorPair[],
  incoming: SessionStudentTutorPair[],
): SessionStudentTutorPair[] {
  const seen = new Set<string>();
  const out: SessionStudentTutorPair[] = [];
  for (const p of [...existing, ...incoming]) {
    const key = `${p.studentUserId}:${p.tutorUserId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Drop all pairs involving the given student. */
export function removeStudentFromPairs(
  pairs: SessionStudentTutorPair[],
  studentUserId: string,
): SessionStudentTutorPair[] {
  if (!studentUserId) return pairs;
  return pairs.filter((p) => p.studentUserId !== studentUserId);
}

/**
 * Build the explicit participants payload for PUT /assignments
 * (required to actually remove a student from session_participants).
 */
export function toAssignmentParticipants(
  participants: Array<{ userId: string; role: string }>,
): Array<{ userId: string; role: 'student' | 'tutor' | 'volunteer' }> {
  const out: Array<{ userId: string; role: 'student' | 'tutor' | 'volunteer' }> = [];
  for (const p of participants) {
    if (p.role !== 'student' && p.role !== 'tutor' && p.role !== 'volunteer') continue;
    if (!p.userId) continue;
    out.push({ userId: p.userId, role: p.role });
  }
  return out;
}

/** Derive pairs from participants when API omitted studentTutorPairs. */
export function derivePairsFromParticipants(
  participants: Array<{ userId: string; role: string }>,
  fallbackTutorId?: string | null,
  sessionType?: SessionType | null,
): SessionStudentTutorPair[] {
  const students = participants.filter((p) => p.role === 'student').map((p) => p.userId);
  const facilitators = participants
    .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
    .map((p) => p.userId);

  let tutorIds: string[];
  if (sessionType === 'whole_class') {
    tutorIds =
      facilitators.length > 0
        ? facilitators
        : fallbackTutorId
          ? [fallbackTutorId]
          : [];
  } else if (facilitators.length === 1) {
    tutorIds = facilitators;
  } else if (fallbackTutorId) {
    tutorIds = [fallbackTutorId];
  } else if (facilitators.length > 0) {
    tutorIds = [facilitators[0]];
  } else {
    tutorIds = [];
  }

  const pairs: SessionStudentTutorPair[] = [];
  for (const studentUserId of students) {
    for (const tutorUserId of tutorIds) {
      pairs.push({ studentUserId, tutorUserId });
    }
  }
  return pairs;
}
