import { Injectable, NotFoundException } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';
import { RequestContextStore } from '../request-context';

type Paginated<T> = {
  data?: T[];
  items?: T[];
  results?: T[];
};

type EdnovProgram = {
  id: string;
  label?: string;
  name?: string;
  code?: string;
  description?: string | null;
  status?: string;
  establishmentId?: string;
  schoolYearId?: string;
};

type EdnovSession = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  subject?: { label?: string; name?: string } | null;
  level?: { label?: string; name?: string } | null;
  program?: { id?: string; label?: string; name?: string } | null;
  description?: string | null;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  establishmentId?: string;
};

type EdnovEstablishment = {
  id: string;
  name?: string;
  label?: string;
  city?: string | null;
  managedById?: string | null;
  managedBy?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  } | null;
  coordinators?: Array<{
    id?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  }>;
  establishmentCoordinators?: Array<{
    coordinator?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
    };
  }>;
};

type EdnovSubject = {
  id: string;
  label?: string;
  name?: string;
  code?: string;
};

export type ListSessionsQuery = {
  limit?: number;
  page?: number;
  dateFrom?: string;
  dateTo?: string;
  statuses?: string[];
  establishmentId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/** Payload for Ednov POST /sessions (subset used by the assistant). */
export type CreateSessionInput = {
  establishmentId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  type: string;
  subjectIds: string[];
  programId?: string | null;
  sessionFormat?: 'in_person' | 'remote' | 'hybrid';
  mode?: 'single' | 'recurring';
  tutorIds?: string[];
  studentIds?: string[];
  volunteerIds?: string[];
  topic?: string | null;
  internalNotes?: string | null;
};

/** Course-shaped view used by existing CourseApplicationService / tools. */
export type CourseView = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  description: string;
  tutor?: { firstName: string; lastName: string } | null;
};

@Injectable()
export class AcademicAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async listProgramsAsCourses(limit = 12): Promise<CourseView[]> {
    const focused = this.focusedProgramOrSession();
    if (focused) {
      const one = await this.findProgramOrSessionAsCourse(focused.id);
      return one ? [one] : [];
    }

    const page = await this.ednov.get<Paginated<EdnovProgram> | EdnovProgram[]>(
      '/academic/programs',
      { params: { page: 1, pageSize: limit } },
    );
    return this.unwrap(page)
      .slice(0, limit)
      .map((program) => this.programToCourse(program));
  }

  async findProgramsByName(name: string): Promise<CourseView[]> {
    const query = name.trim();
    if (!query) return [];

    const page = await this.ednov.get<Paginated<EdnovProgram> | EdnovProgram[]>(
      '/academic/programs',
      { params: { page: 1, pageSize: 8, search: query } },
    );
    return this.unwrap(page)
      .slice(0, 8)
      .map((program) => this.programToCourse(program));
  }

  async findProgramOrSessionAsCourse(id: string): Promise<CourseView> {
    try {
      const program = await this.ednov.get<EdnovProgram>(
        `/academic/programs/${encodeEdnovId(id)}`,
      );
      return this.programToCourse(program);
    } catch {
      // fall through — may be a session id from page context
    }

    try {
      const session = await this.ednov.get<EdnovSession>(
        `/sessions/${encodeEdnovId(id)}`,
      );
      return this.sessionToCourse(session);
    } catch {
      throw new NotFoundException('Course not found');
    }
  }

  async listSessions(limitOrQuery: number | ListSessionsQuery = 20) {
    const query: ListSessionsQuery =
      typeof limitOrQuery === 'number' ? { limit: limitOrQuery } : limitOrQuery;
    const page = await this.listSessionsPage(query);
    return page.sessions;
  }

  async listSessionsPage(query: ListSessionsQuery = {}): Promise<{
    sessions: EdnovSession[];
    total: number | null;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 20));
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('pageSize', String(pageSize));
    if (query.dateFrom) sp.set('dateFrom', query.dateFrom);
    if (query.dateTo) sp.set('dateTo', query.dateTo);
    if (query.establishmentId) sp.set('establishmentId', query.establishmentId);
    if (query.search?.trim()) sp.set('search', query.search.trim());
    if (query.sortBy) sp.set('sortBy', query.sortBy);
    if (query.sortOrder) sp.set('sortOrder', query.sortOrder);
    for (const status of query.statuses ?? []) {
      if (status) sp.append('statuses', status);
    }
    const raw = await this.ednov.get<
      (Paginated<EdnovSession> & { total?: number }) | EdnovSession[]
    >(`/sessions?${sp.toString()}`);
    const sessions = this.unwrap(raw).slice(0, pageSize);
    const total =
      !Array.isArray(raw) && typeof raw.total === 'number' ? raw.total : null;
    return { sessions, total, page, pageSize };
  }

  async getSession(id: string): Promise<EdnovSession> {
    return this.ednov.get<EdnovSession>(`/sessions/${encodeEdnovId(id)}`);
  }

  async countSessions(): Promise<number> {
    const page = await this.ednov.get<
      Paginated<EdnovSession> & { total?: number }
    >('/sessions', { params: { page: 1, pageSize: 1 } });
    if (!Array.isArray(page) && typeof page.total === 'number') {
      return page.total;
    }
    const list = await this.listSessions(100);
    return list.length;
  }

  async getSessionParticipants(sessionId: string) {
    return this.ednov.get<unknown>(
      `/sessions/${encodeEdnovId(sessionId)}/participants`,
    );
  }

  async createSession(dto: CreateSessionInput): Promise<EdnovSession> {
    return this.ednov.post<EdnovSession>('/sessions', dto);
  }

  async cancelSession(
    sessionId: string,
    body: {
      reasonCode: string;
      reasonDetail?: string;
      dematchMode?: string;
    },
  ) {
    return this.ednov.post(`/sessions/${encodeEdnovId(sessionId)}/cancel`, body);
  }

  /**
   * List session reports (GET /sessions/reports).
   * Array filters (statuses, …) are serialized as repeated query keys for Nest.
   */
  async listReports(
    limit = 15,
    params?: Record<
      string,
      string | number | boolean | Array<string | number> | undefined
    >,
  ) {
    const page = await this.listReportsPage(limit, params);
    return page.items;
  }

  async listReportsPage(
    limit = 15,
    params?: Record<
      string,
      string | number | boolean | Array<string | number> | undefined
    >,
  ): Promise<{
    items: Array<{
      id?: string;
      sessionId?: string;
      status?: string;
      sessionDisplayName?: string;
      authorName?: string;
      authorId?: string;
      validatedAt?: string | null;
      validatedByName?: string | null;
      createdAt?: string;
      updatedAt?: string;
      [key: string]: unknown;
    }>;
    total: number | null;
  }> {
    const sp = new URLSearchParams();
    sp.set('page', '1');
    sp.set('pageSize', String(limit));
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === '') continue;
          sp.append(key, String(item));
        }
      } else {
        sp.set(key, String(value));
      }
    }
    const page = await this.ednov.get<
      | (Paginated<{
          id?: string;
          sessionId?: string;
          status?: string;
          sessionDisplayName?: string;
          authorName?: string;
        }> & { total?: number })
      | Array<{
          id?: string;
          sessionId?: string;
          status?: string;
          sessionDisplayName?: string;
          authorName?: string;
          [key: string]: unknown;
        }>
    >(`/sessions/reports?${sp.toString()}`);
    const items = this.unwrap(page).slice(0, limit) as Array<{
      id?: string;
      sessionId?: string;
      status?: string;
      sessionDisplayName?: string;
      authorName?: string;
      authorId?: string;
      validatedAt?: string | null;
      validatedByName?: string | null;
      createdAt?: string;
      updatedAt?: string;
      [key: string]: unknown;
    }>;
    const total =
      !Array.isArray(page) && typeof page.total === 'number' ? page.total : null;
    return { items, total };
  }

  async getReportKpis(params?: Record<string, string | number | undefined>) {
    return this.ednov.get<{
      missingReports?: number;
      overdueReports?: number;
      pendingReports?: number;
      submittedPendingValidation?: number;
      validatedReports?: number;
      [key: string]: unknown;
    }>('/sessions/report-kpis', {
      params,
    });
  }

  async getSessionReport(sessionId: string, reportId: string) {
    return this.ednov.get<{
      id?: string;
      sessionId?: string;
      status?: string;
      sessionDisplayName?: string;
      authorName?: string;
      authorId?: string;
      validatedAt?: string | null;
      validatedByName?: string | null;
      createdAt?: string;
      updatedAt?: string;
      script?: string | null;
      subject?: string | null;
      [key: string]: unknown;
    }>(`/sessions/${encodeEdnovId(sessionId)}/reports/${encodeEdnovId(reportId)}`);
  }

  async getSessionReports(sessionId: string) {
    return this.ednov.get<
      Array<{
        id?: string;
        sessionId?: string;
        status?: string;
        sessionDisplayName?: string;
        authorName?: string;
        [key: string]: unknown;
      }>
    >(`/sessions/${encodeEdnovId(sessionId)}/reports`);
  }

  async getAttendanceHistory(limit = 15) {
    return this.ednov.get<unknown>('/sessions/attendance-history', {
      params: { page: 1, pageSize: limit },
    });
  }

  /**
   * GET /sessions/vsc-reports — paginated `{ data, total, page, pageSize }`.
   * Statuses: draft | submitted | validated. Categories: daily | weekly.
   */
  async listVscReports(
    limit = 20,
    params?: Record<string, string | number | boolean | string[] | undefined>,
  ): Promise<{
    items: Array<Record<string, unknown>>;
    total: number | null;
  }> {
    const sp = new URLSearchParams();
    sp.set('page', '1');
    sp.set('pageSize', String(limit));
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === '') continue;
          sp.append(key, String(item));
        }
      } else {
        sp.set(key, String(value));
      }
    }
    const page = await this.ednov.get<
      | (Paginated<Record<string, unknown>> & { total?: number })
      | Record<string, unknown>[]
    >(`/sessions/vsc-reports?${sp.toString()}`);
    const items = this.unwrap(page).slice(0, limit);
    const total =
      !Array.isArray(page) && typeof page.total === 'number' ? page.total : null;
    return { items, total };
  }

  async listVscDailyReports(
    limit = 20,
    params?: Record<string, string | number | undefined>,
  ): Promise<{
    items: Array<Record<string, unknown>>;
    total: number | null;
  }> {
    const page = await this.ednov.get<
      | (Paginated<Record<string, unknown>> & { total?: number })
      | Record<string, unknown>[]
    >('/sessions/vsc-daily-reports', {
      params: {
        page: 1,
        pageSize: limit,
        ...params,
      },
    });
    const items = this.unwrap(page).slice(0, limit);
    const total =
      !Array.isArray(page) && typeof page.total === 'number' ? page.total : null;
    return { items, total };
  }

  async listSessionVscReports(sessionId: string) {
    return this.ednov.get<Array<Record<string, unknown>> | Paginated<Record<string, unknown>>>(
      `/sessions/${encodeEdnovId(sessionId)}/vsc-reports`,
    );
  }

  async createSessionReport(
    sessionId: string,
    body: Record<string, unknown>,
  ) {
    return this.ednov.post(`/sessions/${encodeEdnovId(sessionId)}/reports`, body);
  }

  async validateSessionReport(sessionId: string, reportId: string) {
    return this.ednov.patch(
      `/sessions/${encodeEdnovId(sessionId)}/reports/${encodeEdnovId(reportId)}/validate`,
    );
  }

  async listEstablishments(limit = 12, search?: string) {
    const page = await this.ednov.get<
      Paginated<EdnovEstablishment> | EdnovEstablishment[]
    >('/companies/current/establishments', {
      params: {
        page: 1,
        pageSize: limit,
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    });
    return this.unwrap(page).slice(0, limit);
  }

  async listSubjects(limit = 12, search?: string) {
    const page = await this.ednov.get<Paginated<EdnovSubject> | EdnovSubject[]>(
      '/academic/subjects',
      {
        params: {
          page: 1,
          pageSize: limit,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      },
    );
    return this.unwrap(page).slice(0, limit);
  }

  resolveFocusedEstablishmentId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.establishment?.id) return ctx.establishment.id;
    if (ctx?.selection?.primary?.type === 'establishment') {
      return ctx.selection.primary.id;
    }
    const filters = ctx?.filters;
    if (filters && typeof filters === 'object') {
      const id = filters.establishmentId ?? filters.establishment_id;
      if (typeof id === 'string' && id.trim()) return id.trim();
    }
    return undefined;
  }

  async getEstablishment(id: string) {
    return this.ednov.get<EdnovEstablishment>(
      `/companies/current/establishments/${encodeEdnovId(id)}`,
    );
  }

  async searchEstablishments(q: string, limit = 10) {
    const query = q.trim();
    if (query.length < 2) return [];
    const page = await this.ednov.get<
      Paginated<EdnovEstablishment> | EdnovEstablishment[]
    >('/companies/current/establishments/search', {
      params: { query, page: 1, limit },
    });
    return this.unwrap(page).slice(0, limit);
  }

  resolveFocusedProgramId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.program?.id) return ctx.program.id;
    if (ctx?.selection?.primary?.type === 'program') {
      return ctx.selection.primary.id;
    }
    return undefined;
  }

  resolveFocusedSessionId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.session?.id) return ctx.session.id;
    if (ctx?.selection?.primary?.type === 'session') {
      return ctx.selection.primary.id;
    }
    // Report focus often carries sessionId in filters when opened from Comptes-rendus
    const filters = ctx?.filters;
    if (filters && typeof filters === 'object') {
      const sid = filters.sessionId ?? filters.session_id;
      if (typeof sid === 'string' && sid.trim()) return sid.trim();
    }
    return undefined;
  }

  resolveFocusedReportId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.report?.id) return ctx.report.id;
    if (ctx?.selection?.primary?.type === 'report') {
      return ctx.selection.primary.id;
    }
    return undefined;
  }

  private focusedProgramOrSession(): { id: string } | null {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.program?.id) return { id: ctx.program.id };
    if (ctx?.course?.id) return { id: ctx.course.id };
    if (ctx?.session?.id) return { id: ctx.session.id };
    if (
      ctx?.selection?.primary &&
      ['program', 'course', 'session'].includes(ctx.selection.primary.type)
    ) {
      return { id: ctx.selection.primary.id };
    }
    return null;
  }

  private programToCourse(program: EdnovProgram): CourseView {
    return {
      id: program.id,
      title: program.label || program.name || program.code || 'Program',
      subject: program.code ?? null,
      level: null,
      description: program.description?.trim() || `Program status: ${program.status ?? 'unknown'}`,
      tutor: null,
    };
  }

  private sessionToCourse(session: EdnovSession): CourseView {
    return {
      id: session.id,
      title: session.title || session.name || 'Session',
      subject: session.subject?.label || session.subject?.name || null,
      level: session.level?.label || session.level?.name || null,
      description:
        session.description?.trim() ||
        `Session status: ${session.status ?? 'unknown'}`,
      tutor: null,
    };
  }

  private unwrap<T>(page: Paginated<T> | T[]): T[] {
    if (Array.isArray(page)) return page;
    return page.data ?? page.items ?? page.results ?? [];
  }
}
