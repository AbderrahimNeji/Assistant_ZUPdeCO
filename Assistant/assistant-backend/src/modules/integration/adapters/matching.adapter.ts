import { Injectable } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';
import { RequestContextStore } from '../request-context';

type Paginated<T> = {
  data?: T[];
  items?: T[];
  results?: T[];
  total?: number;
};

export type AssignmentSource =
  | 'manual'
  | 'auto_binome_coeur'
  | 'auto_history'
  | 'auto_balanced'
  | string;

export type StudentTutorPairPerson = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
};

export type StudentTutorPairSession = {
  id?: string;
  sessionDate?: string | Date | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  type?: string | null;
  establishment?: { id?: string; name?: string | null } | null;
  subjectNames?: string[] | null;
};

/**
 * Normalized Ednov session student–tutor pair.
 * Source fields: studentUser / tutorUser / assignmentSource / createdAt.
 */
export type StudentTutorPair = {
  id?: string;
  studentUserId?: string;
  tutorUserId?: string;
  student?: StudentTutorPairPerson | null;
  tutor?: StudentTutorPairPerson | null;
  /** Assignment origin from API (`assignmentSource`) — not a workflow status. */
  assignmentSource?: AssignmentSource | null;
  /**
   * @deprecated Prefer assignmentSource. Kept only when API unexpectedly sends `status`.
   * Never invent a value when both are missing.
   */
  status?: string | null;
  sessionId?: string;
  session?: StudentTutorPairSession | null;
  createdAt?: string | Date | null;
  sessionCount?: number;
  lastSession?: {
    sessionDate?: string | Date | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
  nextSession?: {
    sessionDate?: string | Date | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
};

export type ListPairsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  studentId?: string;
  tutorId?: string;
  sessionId?: string;
  establishmentId?: string;
  subjectId?: string;
  types?: string[];
};

export type ListPairsResult = {
  pairs: StudentTutorPair[];
  total: number | null;
  page: number;
  pageSize: number;
};

export type AssignmentCandidates = {
  students: StudentTutorPairPerson[];
  tutors: StudentTutorPairPerson[];
};

export type SetAssignmentsInput = {
  pairs: Array<{ studentUserId: string; tutorUserId: string }>;
  participants?: Array<{
    userId: string;
    role: 'student' | 'tutor' | 'volunteer';
  }>;
};

/**
 * Ednov matching / student–tutor pairs via user bearer only.
 */
@Injectable()
export class MatchingAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async listPairs(limit = 20, search?: string): Promise<StudentTutorPair[]> {
    const result = await this.listPairsPage({
      page: 1,
      pageSize: limit,
      search,
    });
    return result.pairs;
  }

  async listPairsPage(query: ListPairsQuery = {}): Promise<ListPairsResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const search = query.search?.trim();

    const raw = await this.ednov.get<
      Paginated<Record<string, unknown>> | Record<string, unknown>[]
    >('/sessions/student-tutor-pairs', {
      params: {
        page,
        pageSize,
        ...(search
          ? { studentSearch: search, tutorSearch: search }
          : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.tutorId ? { tutorId: query.tutorId } : {}),
        ...(query.sessionId ? { sessionId: query.sessionId } : {}),
        ...(query.establishmentId
          ? { establishmentId: query.establishmentId }
          : {}),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.types?.length ? { types: query.types } : {}),
      },
    });

    const pairs = this.unwrap(raw).map((row) => this.normalizePair(row));
    const total =
      !Array.isArray(raw) && typeof raw.total === 'number' ? raw.total : null;

    return { pairs, total, page, pageSize };
  }

  async countPairs(filters?: Omit<ListPairsQuery, 'page' | 'pageSize'>): Promise<{
    total: number | null;
    sampleSize: number;
  }> {
    const result = await this.listPairsPage({
      ...filters,
      page: 1,
      pageSize: 1,
    });
    return {
      total: result.total,
      sampleSize: result.pairs.length,
    };
  }

  async getPair(id: string): Promise<StudentTutorPair> {
    const raw = await this.ednov.get<Record<string, unknown>>(
      `/sessions/student-tutor-pairs/${encodeEdnovId(id)}`,
    );
    return this.normalizePair(raw);
  }

  async getAssignmentCandidates(
    sessionId: string,
  ): Promise<AssignmentCandidates> {
    const raw = await this.ednov.get<{
      students?: Array<Record<string, unknown>>;
      tutors?: Array<Record<string, unknown>>;
    }>(`/sessions/${encodeEdnovId(sessionId)}/assignment-candidates`);

    return {
      students: (raw.students ?? []).map((row) => this.normalizePerson(row)),
      tutors: (raw.tutors ?? []).map((row) => this.normalizePerson(row)),
    };
  }

  async setAssignments(sessionId: string, input: SetAssignmentsInput) {
    return this.ednov.put<unknown>(
      `/sessions/${encodeEdnovId(sessionId)}/assignments`,
      input,
    );
  }

  /** Optional core-pair (binôme cœur) list when the company endpoint is available. */
  async listBinomeCoeur(filters?: {
    establishmentId?: string;
    subjectId?: string;
  }): Promise<Array<Record<string, unknown>> | null> {
    try {
      const raw = await this.ednov.get<
        Array<Record<string, unknown>> | Paginated<Record<string, unknown>>
      >('/companies/current/binome-coeur', {
        params: {
          ...(filters?.establishmentId
            ? { establishmentId: filters.establishmentId }
            : {}),
          ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
        },
      });
      if (Array.isArray(raw)) return raw;
      return raw.data ?? raw.items ?? raw.results ?? [];
    } catch {
      return null;
    }
  }

  resolveFocusedMatchingId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.matching?.id) return ctx.matching.id;
    if (ctx?.selection?.primary?.type === 'matching') {
      return ctx.selection.primary.id;
    }
    const fromEntities = ctx?.selection?.entities?.find(
      (e) => e.type === 'matching',
    );
    return fromEntities?.id;
  }

  /** Student id from page context / selection (including matching selection entities). */
  resolveContextStudentId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.student?.id) return ctx.student.id;
    if (ctx?.selection?.primary?.type === 'student') {
      return ctx.selection.primary.id;
    }
    return ctx?.selection?.entities?.find((e) => e.type === 'student')?.id;
  }

  resolveContextTutorId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.tutor?.id) return ctx.tutor.id;
    if (ctx?.selection?.primary?.type === 'tutor') {
      return ctx.selection.primary.id;
    }
    return ctx?.selection?.entities?.find((e) => e.type === 'tutor')?.id;
  }

  private normalizePair(raw: Record<string, unknown>): StudentTutorPair {
    const studentRaw =
      (raw.student as Record<string, unknown> | undefined) ??
      (raw.studentUser as Record<string, unknown> | undefined);
    const tutorRaw =
      (raw.tutor as Record<string, unknown> | undefined) ??
      (raw.tutorUser as Record<string, unknown> | undefined);
    const sessionRaw = raw.session as Record<string, unknown> | undefined;

    const assignmentSource =
      typeof raw.assignmentSource === 'string'
        ? raw.assignmentSource
        : typeof raw.assignment_source === 'string'
          ? raw.assignment_source
          : null;

    const status =
      typeof raw.status === 'string' && raw.status.trim()
        ? raw.status
        : null;

    return {
      id: typeof raw.id === 'string' ? raw.id : undefined,
      studentUserId:
        typeof raw.studentUserId === 'string'
          ? raw.studentUserId
          : typeof raw.student_user_id === 'string'
            ? raw.student_user_id
            : undefined,
      tutorUserId:
        typeof raw.tutorUserId === 'string'
          ? raw.tutorUserId
          : typeof raw.tutor_user_id === 'string'
            ? raw.tutor_user_id
            : undefined,
      student: studentRaw ? this.normalizePerson(studentRaw) : null,
      tutor: tutorRaw ? this.normalizePerson(tutorRaw) : null,
      assignmentSource,
      status,
      sessionId:
        typeof raw.sessionId === 'string'
          ? raw.sessionId
          : typeof raw.session_id === 'string'
            ? raw.session_id
            : typeof sessionRaw?.id === 'string'
              ? sessionRaw.id
              : undefined,
      session: sessionRaw
        ? {
            id: typeof sessionRaw.id === 'string' ? sessionRaw.id : undefined,
            sessionDate:
              (sessionRaw.sessionDate as string | Date | null | undefined) ??
              null,
            startTime:
              typeof sessionRaw.startTime === 'string'
                ? sessionRaw.startTime
                : null,
            endTime:
              typeof sessionRaw.endTime === 'string'
                ? sessionRaw.endTime
                : null,
            status:
              typeof sessionRaw.status === 'string' ? sessionRaw.status : null,
            type: typeof sessionRaw.type === 'string' ? sessionRaw.type : null,
            establishment: (sessionRaw.establishment as
              | { id?: string; name?: string | null }
              | null
              | undefined) ?? null,
            subjectNames: Array.isArray(sessionRaw.subjectNames)
              ? (sessionRaw.subjectNames as string[])
              : null,
          }
        : null,
      createdAt:
        (raw.createdAt as string | Date | null | undefined) ??
        (raw.created_at as string | Date | null | undefined) ??
        null,
      sessionCount:
        typeof raw.sessionCount === 'number' ? raw.sessionCount : undefined,
      lastSession:
        (raw.lastSession as StudentTutorPair['lastSession']) ?? null,
      nextSession:
        (raw.nextSession as StudentTutorPair['nextSession']) ?? null,
    };
  }

  private normalizePerson(row: Record<string, unknown>): StudentTutorPairPerson {
    return {
      id: typeof row.id === 'string' ? row.id : undefined,
      firstName:
        typeof row.firstName === 'string'
          ? row.firstName
          : typeof row.first_name === 'string'
            ? row.first_name
            : null,
      lastName:
        typeof row.lastName === 'string'
          ? row.lastName
          : typeof row.last_name === 'string'
            ? row.last_name
            : null,
      displayName:
        typeof row.displayName === 'string'
          ? row.displayName
          : typeof row.display_name === 'string'
            ? row.display_name
            : null,
    };
  }

  private unwrap(
    page: Paginated<Record<string, unknown>> | Record<string, unknown>[],
  ): Record<string, unknown>[] {
    if (Array.isArray(page)) return page;
    return page.data ?? page.items ?? page.results ?? [];
  }
}
