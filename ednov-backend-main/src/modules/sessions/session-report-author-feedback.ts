import { BadRequestException } from '@nestjs/common';
import type { Session } from './entities/session.entity';
import type { SessionParticipant, ParticipantRole } from './entities/session-participant.entity';
import type { SessionReportFeeling } from './session-report-feeling';

export interface SessionReportAuthorFeedback {
  idAuteur: string;
  rating: number | null;
  comment: string | null;
  feeling: SessionReportFeeling | null;
}

const NON_STUDENT_ROLE_ORDER: Record<ParticipantRole, number> = {
  tutor: 0,
  volunteer: 1,
  student: 99,
};

/** Comptes VSC en base : code `volunteer` (label UI « VSC ») ou `vsc`. */
const PRIVILEGED_REPORT_EDITOR_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGER',
  'COORDINATOR',
  'VSC',
  'VOLUNTEER',
] as const;

export function isPrivilegedSessionReportEditor(roleCodes: string[] | undefined): boolean {
  if (!roleCodes?.length) return false;
  const upper = new Set(roleCodes.map((c) => (c ?? '').toUpperCase()));
  return PRIVILEGED_REPORT_EDITOR_ROLES.some((r) => upper.has(r));
}

/** Non-student participant userIds; whole_class → all, else → one slot. */
export function getNonStudentAuthorIds(
  session: Pick<Session, 'type' | 'managedById' | 'createdById'>,
  participants: Pick<SessionParticipant, 'userId' | 'role'>[],
  reportAuthorId?: string | null,
): string[] {
  const nonStudents = participants.filter((p) => p.role !== 'student');
  if (session.type === 'whole_class') {
    return [...nonStudents]
      .sort((a, b) => {
        const ra = NON_STUDENT_ROLE_ORDER[a.role] ?? 2;
        const rb = NON_STUDENT_ROLE_ORDER[b.role] ?? 2;
        if (ra !== rb) return ra - rb;
        return a.userId.localeCompare(b.userId);
      })
      .map((p) => p.userId);
  }
  const ordered = [...nonStudents].sort((a, b) => {
    const ra = NON_STUDENT_ROLE_ORDER[a.role] ?? 2;
    const rb = NON_STUDENT_ROLE_ORDER[b.role] ?? 2;
    if (ra !== rb) return ra - rb;
    return a.userId.localeCompare(b.userId);
  });
  if (ordered.length > 0) return [ordered[0].userId];
  const fallback = reportAuthorId ?? session.managedById ?? session.createdById ?? null;
  return fallback ? [fallback] : [];
}

/** Stable skeleton; preserves existing entries, adds empty slots for new authors. */
export function buildAuthorFeedbackSkeleton(
  authorIds: string[],
  existing?: SessionReportAuthorFeedback[] | null,
): SessionReportAuthorFeedback[] {
  const byId = new Map((existing ?? []).map((e) => [e.idAuteur, e]));
  return authorIds.map((idAuteur) => {
    const prev = byId.get(idAuteur);
    return {
      idAuteur,
      rating: prev?.rating ?? null,
      comment: prev?.comment ?? null,
      feeling: prev?.feeling ?? null,
    };
  });
}

export function assertAuthorFeedbacksShape(
  authorIds: string[],
  authorFeedbacks: SessionReportAuthorFeedback[],
): void {
  if (authorFeedbacks.length !== authorIds.length) {
    throw new BadRequestException(
      `authorFeedbacks must contain exactly ${authorIds.length} entries for this session type`,
    );
  }
  const expected = new Set(authorIds);
  for (const entry of authorFeedbacks) {
    if (!expected.has(entry.idAuteur)) {
      throw new BadRequestException(`Unknown author feedback idAuteur: ${entry.idAuteur}`);
    }
  }
  const seen = new Set(authorFeedbacks.map((e) => e.idAuteur));
  if (seen.size !== authorFeedbacks.length) {
    throw new BadRequestException('Duplicate idAuteur in authorFeedbacks');
  }
}

export function mergeAuthorFeedbackUpdate(
  existing: SessionReportAuthorFeedback[],
  patch: SessionReportAuthorFeedback[] | undefined,
  actorId: string,
  isPrivileged: boolean,
): SessionReportAuthorFeedback[] {
  if (!patch?.length) return existing;
  for (const item of patch) {
    const slot = existing.find((e) => e.idAuteur === item.idAuteur);
    if (!slot) {
      throw new BadRequestException(`Unknown author feedback idAuteur: ${item.idAuteur}`);
    }
    if (!isPrivileged && item.idAuteur !== actorId) {
      throw new BadRequestException('You can only update your own session report feedback');
    }
  }
  const patchById = new Map(patch.map((p) => [p.idAuteur, p]));
  return existing.map((entry) => {
    const p = patchById.get(entry.idAuteur);
    if (!p) return entry;
    return {
      idAuteur: entry.idAuteur,
      rating: p.rating !== undefined ? p.rating : entry.rating,
      comment: p.comment !== undefined ? p.comment : entry.comment,
      feeling: p.feeling !== undefined ? p.feeling : entry.feeling,
    };
  });
}

export function isActorFeedbackComplete(
  report: {
    subjectIds?: string[];
    subject?: string | null;
    authorFeedbacks: SessionReportAuthorFeedback[];
  },
  actorId: string,
): boolean {
  const entry = report.authorFeedbacks.find((e) => e.idAuteur === actorId);
  if (!entry) return false;
  const hasMatiere =
    (Array.isArray(report.subjectIds) && report.subjectIds.length > 0) || !!report.subject?.trim();
  return !!(entry.rating && hasMatiere && entry.comment?.trim());
}

export function hasActorFeedbackData(entry: SessionReportAuthorFeedback | undefined): boolean {
  if (!entry) return false;
  return entry.rating != null || !!entry.comment?.trim() || entry.feeling != null;
}

/** Primary entry for list/export: author of report, else first rated, else first. */
export function getDisplayAuthorFeedback(
  report: Pick<{ authorFeedbacks: SessionReportAuthorFeedback[]; authorId: string }, 'authorFeedbacks' | 'authorId'>,
): SessionReportAuthorFeedback | null {
  const arr = report.authorFeedbacks ?? [];
  if (!arr.length) return null;
  return (
    arr.find((e) => e.idAuteur === report.authorId && e.rating != null) ??
    arr.find((e) => e.idAuteur === report.authorId) ??
    arr.find((e) => e.rating != null) ??
    arr[0]
  );
}
