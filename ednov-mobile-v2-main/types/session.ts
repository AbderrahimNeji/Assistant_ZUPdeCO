/**
 * Session (séance) assigned to the tutor.
 * Align with backend GET /sessions and GET /sessions/:id.
 * Backend status: planned | in_progress | completed | closed | cancelled.
 */
export type SessionStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled';

/** Session format for display (backend: session_format in_person | remote | hybrid). */
export type SessionFormat = 'visio' | 'presentiel' | 'hybrid';

/** Backend session type (e.g. individual_tutoring, whole_class). */
export type SessionType = 'individual_tutoring' | 'whole_class' | string;

export interface Session {
  id: string;
  /** Backend `type` — utilisé pour CR multi-tuteurs (`whole_class`). */
  type?: SessionType | null;
  /** ISO date or date-time string (backend: sessionDate + startTime) */
  date: string;
  room?: string | null;
  establishment?: string | null;
  /** Backend `establishmentId` — required to filter students by établissement. */
  establishmentId?: string | null;
  status?: SessionStatus | null;
  /** Session format when available (backend sessionFormat); otherwise derived from joinLink. */
  format?: SessionFormat | null;
  /** Meeting/join URL when session is joinable (backend: joinLink | sessionLink | meetingUrl). */
  joinLink?: string | null;
  /** Associated report id for "Voir le CR" (backend: reportId | crId). */
  reportId?: string | null;
  /** Session end time (backend: endTime, e.g. HH:mm or HH:mm:ss). Used for CR reminder scheduling. */
  endTime?: string | null;
  /** Present on list/detail responses when backend includes session participants. */
  participants?: SessionParticipant[];
  /** Matières prévues sur la séance (backend `subject_ids`). */
  subjectIds?: string[];
  /** Tutor–student pairs from GET /sessions/:id (`studentTutorPairs`). */
  studentTutorPairs?: SessionStudentTutorPair[];
}

/** One tutor–student pair on a session (backend session_student_tutor_pairs). */
export interface SessionStudentTutorPair {
  studentUserId: string;
  tutorUserId: string;
}

/** Query params for GET /sessions (backend ListSessionsQueryDto). */
export interface ListSessionsQuery {
  dateFrom?: string;
  dateTo?: string;
  /** @deprecated prefer `statuses`; backend uses repeated `statuses` */
  status?: SessionStatus;
  statuses?: SessionStatus[];
  establishmentId?: string;
  roomId?: string;
  page?: number;
  pageSize?: number;
  /** Backend list sort (e.g. sessionDate + sortOrder asc = nearest session first). */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type SessionFilter = 'all' | 'week' | 'upcoming' | 'past';

/** Attendance status for a session participant (backend: session_participants.attendance_status). */
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

/** Session participant (élève, tuteur, etc.) with attendance. From GET /sessions/:id/participants. */
export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  role: 'tutor' | 'volunteer' | 'student';
  attendanceStatus: AttendanceStatus;
  /** Motif d'absence (pour absence justifiée). */
  absenceJustification?: string | null;
  /** Commentaire d'absence (optionnel). */
  absenceComment?: string | null;
  /** Public label when provided by API (user.displayName). */
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/** Libellé français du statut de présence (aligné saisie séance : rôles tuteur/bénévole vs élève). */
export function getAttendanceLabel(
  status: AttendanceStatus,
  role?: SessionParticipant['role'],
): string {
  switch (status) {
    case 'present':
      return 'Présent';
    case 'absent':
      return role === 'tutor' || role === 'volunteer' ? 'Absence non justifiée' : 'Absent';
    case 'excused':
      return role === 'tutor' || role === 'volunteer' ? 'Absence justifiée' : 'Excusé';
    case 'pending':
      return 'En attente';
    default:
      return 'En attente';
  }
}

const GENERIC_STUDENT_SESSION_LABEL = 'Élève';

/** Shown on session cards when no student participant is assigned (list/detail). */
export const SESSION_NO_STUDENT_ASSIGNED_LABEL = 'Aucun élève assigné';

/** Single line for session cards: one full name, two names, or first two + ellipsis. */
export function formatSessionStudentsTitle(participants?: SessionParticipant[] | null): string {
  if (!participants?.length) return SESSION_NO_STUDENT_ASSIGNED_LABEL;
  const students = participants.filter((p) => p.role === 'student');
  if (students.length === 0) return SESSION_NO_STUDENT_ASSIGNED_LABEL;

  const seen = new Set<string>();
  const names: string[] = [];
  for (const p of students) {
    if (seen.has(p.userId)) continue;
    seen.add(p.userId);
    names.push(getSessionParticipantDisplayLabel(p, GENERIC_STUDENT_SESSION_LABEL));
  }
  if (names.length === 0) return SESSION_NO_STUDENT_ASSIGNED_LABEL;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]}, …`;
}

/**
 * Assiduité / présences : élèves + uniquement la ligne tuteur/bénévole de l'utilisateur connecté.
 */
export function filterParticipantsForViewerAssiduity(
  participants: SessionParticipant[] | undefined,
  viewerUserId: string | undefined,
): SessionParticipant[] {
  if (!participants?.length) return [];
  const students = participants.filter((p) => p.role === 'student');
  if (!viewerUserId) return students;
  const self = participants.filter(
    (p) => (p.role === 'tutor' || p.role === 'volunteer') && p.userId === viewerUserId,
  );
  return [...self, ...students];
}

export function sessionStudentCount(participants?: SessionParticipant[] | null): number {
  if (!participants?.length) return 0;
  const ids = new Set<string>();
  for (const p of participants) {
    if (p.role === 'student') ids.add(p.userId);
  }
  return ids.size;
}

/** Affiche prénom + 2 premières lettres du nom (profil tuteur/VSC). */
export function displayNameMasked(
  firstName?: string | null,
  lastName?: string | null,
  fallback = '—',
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (!first && !last) return fallback;
  if (!last) return first;
  const initials = last.slice(0, 2).toUpperCase() + '.';
  return first ? `${first} ${initials}` : initials;
}

/**
 * Prefer API `displayName` (public pseudonym); otherwise masked first/last; then fallback.
 * Use for session cards, présence lists, and attendance UI.
 */
export function getSessionParticipantDisplayLabel(
  p: Pick<SessionParticipant, 'displayName' | 'firstName' | 'lastName'>,
  fallback = 'Élève',
): string {
  const d = (p.displayName ?? '').trim();
  if (d.length > 0) return d;
  return displayNameMasked(p.firstName, p.lastName, fallback);
}

/** One entry in attendance history: session + its participants. */
export interface AttendanceHistoryEntry {
  session: Session;
  participants: SessionParticipant[];
}

/** Paged response for GET /sessions/attendance-history. */
export interface AttendanceHistoryResponse {
  items: AttendanceHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Query params for GET /sessions/attendance-history. */
export interface AttendanceHistoryQuery {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/** Candidate for assignment (student or tutor) from GET /sessions/:id/assignment-candidates. */
export interface AssignmentCandidate {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

/** Response from GET /sessions/:id/assignment-candidates. */
export interface AssignmentCandidatesResponse {
  students: AssignmentCandidate[];
  tutors: AssignmentCandidate[];
}
