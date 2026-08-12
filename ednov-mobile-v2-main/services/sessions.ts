import { env } from '@/config/env';
import api from '@/services/api';
import type {
  ListSessionsQuery,
  Session,
  SessionParticipant,
  SessionStatus,
  AttendanceStatus,
  AttendanceHistoryEntry,
  AttendanceHistoryResponse,
  AttendanceHistoryQuery,
  AssignmentCandidate,
  AssignmentCandidatesResponse,
} from '@/types/session';
import {
  getStaticSessions,
  getStaticReportKpis,
  getStaticTutorDashboard,
  getStaticSessionParticipants,
  getStaticAttendanceHistory,
} from '@/data/staticData';

/** Backend may return status in UPPERCASE (e.g. IN_PROGRESS). Normalize to lowercase for canEditPresence and UI. */
function normalizeSessionStatus(rawStatus: unknown): SessionStatus | null {
  if (rawStatus == null || typeof rawStatus !== 'string') return null;
  const lower = rawStatus.toLowerCase();
  if (['planned', 'in_progress', 'completed', 'closed', 'cancelled'].includes(lower)) {
    return lower as SessionStatus;
  }
  return null;
}

/** Map backend session entity to mobile Session. Backend: sessionDate, startTime, establishmentId, roomId, establishment?, room?. */
function mapRawToSession(raw: Record<string, unknown>): Session {
  const sessionDate = raw.sessionDate != null ? String(raw.sessionDate).slice(0, 10) : '';
  const startTime = raw.startTime != null ? String(raw.startTime) : '00:00:00';
  const date = sessionDate && startTime ? `${sessionDate}T${startTime}` : String(raw.date ?? raw.sessionDate ?? '');
  const establishment =
    (raw.establishment && typeof raw.establishment === 'object' && 'name' in raw.establishment
      ? (raw.establishment as { name?: string }).name
      : (raw.establishment as string | null)) ?? null;
  const room =
    (raw.room && typeof raw.room === 'object' && 'name' in raw.room
      ? (raw.room as { name?: string }).name
      : (raw.room as string | null)) ?? null;
  const joinLink =
    (raw.joinLink != null && String(raw.joinLink).trim()) ||
    (raw.sessionLink != null && String(raw.sessionLink).trim()) ||
    (raw.meetingUrl != null && String(raw.meetingUrl).trim()) ||
    null;
  const sessionFormat = raw.sessionFormat != null ? String(raw.sessionFormat) : '';
  const format =
    sessionFormat === 'in_person'
      ? ('presentiel' as const)
      : sessionFormat === 'remote'
        ? ('visio' as const)
        : sessionFormat === 'hybrid'
          ? ('hybrid' as const)
          : joinLink
            ? ('visio' as const)
            : ('presentiel' as const);
  const reportId =
    (raw.reportId != null && String(raw.reportId).trim()) ||
    (raw.crId != null && String(raw.crId).trim()) ||
    null;
  const endTime =
    raw.endTime != null && String(raw.endTime).trim()
      ? String(raw.endTime).trim()
      : null;
  const id = String(raw.id ?? '');
  const subjectRaw = raw.subjectIds ?? raw.subject_ids;
  const subjectIds = Array.isArray(subjectRaw)
    ? subjectRaw.map((x) => String(x)).filter(Boolean)
    : undefined;
  const typeRaw = raw.type != null ? String(raw.type) : null;
  const establishmentIdRaw = raw.establishmentId ?? raw.establishment_id;
  const establishmentId =
    establishmentIdRaw != null && String(establishmentIdRaw).trim()
      ? String(establishmentIdRaw).trim()
      : null;
  const base: Session = {
    id,
    ...(typeRaw ? { type: typeRaw } : {}),
    date,
    room: room ?? null,
    establishment: establishment ?? null,
    ...(establishmentId ? { establishmentId } : {}),
    status: normalizeSessionStatus(raw.status) ?? (raw.status as Session['status']) ?? null,
    format,
    joinLink: joinLink || null,
    reportId: reportId || null,
    endTime: endTime ?? null,
    ...(subjectIds?.length ? { subjectIds } : {}),
  };
  const participantsRaw = Array.isArray(raw.participants) ? raw.participants : [];
  const participants = participantsRaw.map((item: unknown) =>
    mapRawToParticipant(item as Record<string, unknown>, id),
  );
  const pairsRaw = Array.isArray(raw.studentTutorPairs)
    ? raw.studentTutorPairs
    : Array.isArray(raw.student_tutor_pairs)
      ? raw.student_tutor_pairs
      : [];
  const studentTutorPairs = pairsRaw
    .map((item: unknown) => {
      const p = (item ?? {}) as Record<string, unknown>;
      const studentUserId = String(p.studentUserId ?? p.student_user_id ?? '').trim();
      const tutorUserId = String(p.tutorUserId ?? p.tutor_user_id ?? '').trim();
      if (!studentUserId || !tutorUserId) return null;
      return { studentUserId, tutorUserId };
    })
    .filter((p): p is { studentUserId: string; tutorUserId: string } => p != null);

  const withParticipants =
    participants.length > 0 ? { ...base, participants } : base;
  return studentTutorPairs.length > 0
    ? { ...withParticipants, studentTutorPairs }
    : withParticipants;
}

function appendListSessionsQueryParams(params: URLSearchParams, query?: ListSessionsQuery): void {
  if (!query) return;
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  if (query.establishmentId) params.set('establishmentId', query.establishmentId);
  if (query.roomId) params.set('roomId', query.roomId);
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  if (query.statuses?.length) {
    for (const s of query.statuses) {
      params.append('statuses', s.toUpperCase());
    }
  } else if (query.status) {
    params.append('statuses', query.status.toUpperCase());
  }
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);
}

function orderSessionsForListQuery(list: Session[], query?: ListSessionsQuery): Session[] {
  const out = [...list];
  const asc = (query?.sortOrder ?? 'asc').toLowerCase() !== 'desc';
  out.sort((a, b) => {
    const t = new Date(a.date).getTime() - new Date(b.date).getTime();
    return asc ? t : -t;
  });
  return out;
}

export interface SessionsPageResult {
  sessions: Session[];
  total: number;
  page: number;
  pageSize: number;
}

function filterStaticSessionsForQuery(
  list: Session[],
  query?: ListSessionsQuery,
): Session[] {
  let out = list;
  const df = query?.dateFrom;
  const dt = query?.dateTo;
  if (df) {
    out = out.filter((s) => s.date.slice(0, 10) >= df);
  }
  if (dt) {
    out = out.filter((s) => s.date.slice(0, 10) <= dt);
  }
  const statusList =
    query?.statuses?.length ? query.statuses : query?.status ? [query.status] : null;
  if (statusList?.length) {
    out = out.filter((s) => statusList.includes((s.status ?? 'planned') as SessionStatus));
  }
  return out;
}

/** Paginated GET /sessions; uses backend `{ data, total, page, pageSize }` when present. */
/**
 * Nombre total de séances du tuteur (même périmètre que GET /sessions) sur une plage de dates.
 * Utilisé par le dashboard : un seul appel avec pageSize=1 suffit car la réponse inclut `total`.
 */
export async function fetchSessionsTotalForDateRange(
  dateFrom: string,
  dateTo: string,
): Promise<number> {
  const { total } = await fetchSessionsPage({
    dateFrom,
    dateTo,
    page: 1,
    pageSize: 1,
  });
  return Number.isFinite(total) && total >= 0 ? total : 0;
}

export async function fetchSessionsPage(query?: ListSessionsQuery): Promise<SessionsPageResult> {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 20;

  if (env.useStaticData) {
    const full = getStaticSessions().map((s) => ({
      ...s,
      participants: getStaticSessionParticipants(s.id),
    }));
    const filtered = orderSessionsForListQuery(filterStaticSessionsForQuery(full, query), query);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const sessions = filtered.slice(start, start + pageSize);
    return { sessions, total, page, pageSize };
  }

  if (env.apiUrl) {
    const params = new URLSearchParams();
    appendListSessionsQueryParams(params, { ...query, page, pageSize });
    const qs = params.toString();
    const url = qs ? `/sessions?${qs}` : '/sessions';
    const { data } = await api.get<unknown>(url);
    const raw = data as Record<string, unknown> | undefined;
    const items = Array.isArray(data) ? data : raw?.items ?? raw?.data;
    const arr = Array.isArray(items) ? items : [];
    const sessions = arr.map((item: unknown) => mapRawToSession(item as Record<string, unknown>));
    const total = Number(raw?.total ?? (Array.isArray(data) ? arr.length : arr.length));
    const resPage = Number(raw?.page ?? page);
    const resPageSize = Number(raw?.pageSize ?? pageSize);
    if (__DEV__ && env.apiUrl && arr.length === 0 && raw && !Array.isArray(data)) {
      console.debug('[sessions] GET /sessions returned 0 items. Response keys:', raw ? Object.keys(raw) : []);
    }
    return { sessions, total, page: resPage, pageSize: resPageSize };
  }

  const full = getStaticSessions().map((s) => ({
    ...s,
    participants: getStaticSessionParticipants(s.id),
  }));
  const filtered = orderSessionsForListQuery(filterStaticSessionsForQuery(full, query), query);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const sessions = filtered.slice(start, start + pageSize);
  return { sessions, total, page, pageSize };
}

export async function fetchSessions(query?: ListSessionsQuery): Promise<Session[]> {
  if (env.useStaticData) {
    return getStaticSessions().map((s) => ({
      ...s,
      participants: getStaticSessionParticipants(s.id),
    }));
  }
  if (env.apiUrl) {
    const params = new URLSearchParams();
    appendListSessionsQueryParams(params, query);
    const qs = params.toString();
    const url = qs ? `/sessions?${qs}` : '/sessions';
    const { data } = await api.get<unknown>(url);
    const raw = data as Record<string, unknown> | undefined;
    const items =
      Array.isArray(data)
        ? data
        : raw?.items ?? raw?.data;
    const arr = Array.isArray(items) ? items : [];
    if (__DEV__ && env.apiUrl && arr.length === 0 && raw && !Array.isArray(data)) {
      console.debug('[sessions] GET /sessions returned 0 items. Response keys:', raw ? Object.keys(raw) : []);
    }
    return arr.map((item: unknown) => mapRawToSession(item as Record<string, unknown>));
  }
  return getStaticSessions().map((s) => ({
    ...s,
    participants: getStaticSessionParticipants(s.id),
  }));
}

export async function fetchSessionById(id: string): Promise<Session | null> {
  if (env.useStaticData) {
    const list = getStaticSessions();
    const found = list.find((s) => s.id === id);
    if (!found) return null;
    return { ...found, participants: getStaticSessionParticipants(id) };
  }
  if (env.apiUrl) {
    try {
      const { data } = await api.get<unknown>(`/sessions/${id}`);
      return mapRawToSession(data as Record<string, unknown>);
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
      if (status === 403 || status === 404) return null;
      throw err;
    }
  }
  const list = getStaticSessions();
  const found = list.find((s) => s.id === id);
  if (!found) return null;
  return { ...found, participants: getStaticSessionParticipants(id) };
}

/** Map backend session participant (with user relation) to SessionParticipant. */
function mapRawToParticipant(raw: Record<string, unknown>, sessionId: string): SessionParticipant {
  const user = raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null;
  const firstName = user?.firstName != null ? String(user.firstName) : null;
  const lastName = user?.lastName != null ? String(user.lastName) : null;
  const displayNameRaw = user?.displayName != null ? String(user.displayName).trim() : '';
  const displayName = displayNameRaw.length > 0 ? displayNameRaw : null;
  const roleRaw = raw.role != null ? String(raw.role).toLowerCase() : 'student';
  const role = (['tutor', 'volunteer', 'student'].includes(roleRaw)
    ? roleRaw
    : 'student') as SessionParticipant['role'];
  const attendanceRaw =
    raw.attendanceStatus != null
      ? String(raw.attendanceStatus).toLowerCase()
      : raw.attendance_status != null
        ? String(raw.attendance_status).toLowerCase()
        : 'pending';
  const attendanceStatus = (['present', 'absent', 'excused', 'pending'].includes(attendanceRaw)
    ? attendanceRaw
    : 'pending') as SessionParticipant['attendanceStatus'];
  const absenceJustification =
    raw.absenceJustification != null ? String(raw.absenceJustification) : raw.absence_justification != null ? String(raw.absence_justification) : null;
  const absenceComment =
    raw.absenceComment != null ? String(raw.absenceComment) : raw.absence_comment != null ? String(raw.absence_comment) : null;
  const userId = raw.userId ?? raw.user_id;
  return {
    id: String(raw.id ?? ''),
    sessionId,
    userId: String(userId ?? ''),
    role,
    attendanceStatus,
    absenceJustification: absenceJustification ?? undefined,
    absenceComment: absenceComment ?? undefined,
    displayName: displayName ?? undefined,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
  };
}

export async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  if (env.useStaticData) return getStaticSessionParticipants(sessionId);
  if (env.apiUrl) {
    try {
      const { data } = await api.get<unknown>(`/sessions/${sessionId}/participants`);
      const arr = Array.isArray(data) ? data : [];
      return arr.map((item: unknown) => mapRawToParticipant(item as Record<string, unknown>, sessionId));
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
      if (status === 403 || status === 404) return [];
      throw err;
    }
  }
  return getStaticSessionParticipants(sessionId);
}

export async function updateSessionParticipant(
  sessionId: string,
  participantId: string,
  payload: {
    attendanceStatus?: AttendanceStatus;
    absenceJustification?: string | null;
    absenceComment?: string | null;
  },
): Promise<SessionParticipant> {
  const body: Record<string, unknown> = {};
  if (payload.attendanceStatus !== undefined) body.attendanceStatus = payload.attendanceStatus;
  if (payload.absenceJustification !== undefined) body.absenceJustification = payload.absenceJustification ?? null;
  if (payload.absenceComment !== undefined) body.absenceComment = payload.absenceComment ?? null;

  if (env.useStaticData) {
    const list = getStaticSessionParticipants(sessionId);
    const existing = list.find((p) => p.id === participantId);
    if (!existing) return Promise.reject(new Error('Participant not found'));
    return Promise.resolve({
      ...existing,
      attendanceStatus: payload.attendanceStatus ?? existing.attendanceStatus,
      absenceJustification: payload.absenceJustification !== undefined ? payload.absenceJustification ?? undefined : existing.absenceJustification,
      absenceComment: payload.absenceComment !== undefined ? payload.absenceComment ?? undefined : existing.absenceComment,
    });
  }
  if (env.apiUrl) {
    const { data } = await api.patch<unknown>(
      `/sessions/${sessionId}/participants/${participantId}`,
      body,
    );
    return mapRawToParticipant(data as Record<string, unknown>, sessionId);
  }
  const list = getStaticSessionParticipants(sessionId);
  const existing = list.find((p) => p.id === participantId);
  if (!existing) return Promise.reject(new Error('Participant not found'));
  return Promise.resolve({
    ...existing,
    attendanceStatus: payload.attendanceStatus ?? existing.attendanceStatus,
    absenceJustification: payload.absenceJustification !== undefined ? payload.absenceJustification ?? undefined : existing.absenceJustification,
    absenceComment: payload.absenceComment !== undefined ? payload.absenceComment ?? undefined : existing.absenceComment,
  });
}

/** Mirror web StudentAvailabilityResult (GET /sessions/check-student-availability). */
export type StudentAvailabilityResult = {
  available: boolean;
  conflictingSession?: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
  };
};

/** Check whether a student already has a session at the given date/time slot (read-only). */
export async function checkStudentAvailability(params: {
  studentId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  excludeSessionId?: string;
}): Promise<StudentAvailabilityResult> {
  if (env.useStaticData || !env.apiUrl) {
    return { available: true };
  }
  const query = new URLSearchParams({
    studentId: params.studentId,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
  });
  if (params.excludeSessionId) {
    query.append('excludeSessionId', params.excludeSessionId);
  }
  const { data } = await api.get<unknown>(
    `/sessions/check-student-availability?${query.toString()}`,
  );
  const raw = (data ?? {}) as Record<string, unknown>;
  const conflictRaw = raw.conflictingSession as Record<string, unknown> | undefined;
  return {
    available: raw.available === true,
    ...(conflictRaw
      ? {
          conflictingSession: {
            id: String(conflictRaw.id ?? ''),
            sessionDate: String(conflictRaw.sessionDate ?? conflictRaw.session_date ?? ''),
            startTime: String(conflictRaw.startTime ?? conflictRaw.start_time ?? ''),
            endTime: String(conflictRaw.endTime ?? conflictRaw.end_time ?? ''),
          },
        }
      : {}),
  };
}

export type SessionAssignmentPair = { studentUserId: string; tutorUserId: string };
export type SessionAssignmentParticipant = {
  userId: string;
  role: 'student' | 'tutor' | 'volunteer';
};

/** PUT /sessions/:id/assignments — full replace of pairs (merge client-side before calling). */
export async function setSessionAssignments(
  sessionId: string,
  pairs: SessionAssignmentPair[],
  participants?: SessionAssignmentParticipant[],
): Promise<SessionAssignmentPair[]> {
  if (env.useStaticData || !env.apiUrl) {
    return pairs;
  }
  const body: {
    pairs: SessionAssignmentPair[];
    participants?: SessionAssignmentParticipant[];
  } = { pairs };
  if (participants) body.participants = participants;
  const { data } = await api.put<unknown>(`/sessions/${sessionId}/assignments`, body);
  const arr = Array.isArray(data) ? data : [];
  return arr
    .map((item: unknown) => {
      const p = (item ?? {}) as Record<string, unknown>;
      const studentUserId = String(p.studentUserId ?? p.student_user_id ?? '').trim();
      const tutorUserId = String(p.tutorUserId ?? p.tutor_user_id ?? '').trim();
      if (!studentUserId || !tutorUserId) return null;
      return { studentUserId, tutorUserId };
    })
    .filter((p): p is SessionAssignmentPair => p != null);
}

/** Map raw User from backend (snake_case or camelCase) to AssignmentCandidate. */
function mapRawToAssignmentCandidate(raw: Record<string, unknown>): AssignmentCandidate {
  const id = raw.id ?? raw.userId;
  const firstName = raw.firstName ?? raw.first_name ?? null;
  const lastName = raw.lastName ?? raw.last_name ?? null;
  return {
    id: String(id ?? ''),
    firstName: typeof firstName === 'string' ? firstName : null,
    lastName: typeof lastName === 'string' ? lastName : null,
  };
}

export async function fetchAssignmentCandidates(
  sessionId: string,
): Promise<AssignmentCandidatesResponse> {
  if (env.useStaticData) return { students: [], tutors: [] };
  if (env.apiUrl) {
    const { data } = await api.get<{ students?: unknown[]; tutors?: unknown[] }>(
      `/sessions/${sessionId}/assignment-candidates`,
    );
    const students = Array.isArray(data?.students)
      ? data.students.map((item: unknown) => mapRawToAssignmentCandidate((item ?? {}) as Record<string, unknown>))
      : [];
    const tutors = Array.isArray(data?.tutors)
      ? data.tutors.map((item: unknown) => mapRawToAssignmentCandidate((item ?? {}) as Record<string, unknown>))
      : [];
    return { students, tutors };
  }
  return { students: [], tutors: [] };
}

/** Response from GET /sessions/report-kpis */
export interface ReportKpis {
  missingReports: number;
  overdueReports: number;
  /** Backend ≥ pendingReports : CR en to_complete, draft ou overdue (sinon mobile retombe sur overdueReports). */
  pendingReports?: number;
  submittedPendingValidation: number;
  validatedReports: number;
}

export async function fetchReportKpis(): Promise<ReportKpis> {
  if (env.useStaticData) return getStaticReportKpis();
  const { data } = await api.get<ReportKpis>('/sessions/report-kpis');
  return data;
}

/** Response from GET /sessions/dashboard/tutor */
export interface TutorDashboard {
  upcomingSessions: Session[];
  reportsToSubmit: unknown[];
  /** All reports (draft + submitted) for the CR list and filters (à saisir / saisi). */
  reports?: unknown[];
}

export async function fetchTutorDashboard(): Promise<TutorDashboard> {
  if (env.useStaticData) return getStaticTutorDashboard();
  const { data } = await api.get<unknown>('/sessions/dashboard/tutor');
  const raw = data as Record<string, unknown>;
  const upcoming = Array.isArray(raw.upcomingSessions)
    ? (raw.upcomingSessions as Record<string, unknown>[]).map((s) => mapRawToSession(s))
    : [];
  return {
    upcomingSessions: upcoming,
    reportsToSubmit: Array.isArray(raw.reportsToSubmit) ? raw.reportsToSubmit : [],
    reports: Array.isArray(raw.reports) ? raw.reports : [],
  };
}

export type { AttendanceHistoryQuery } from '@/types/session';

export async function fetchAttendanceHistory(
  query?: AttendanceHistoryQuery,
): Promise<AttendanceHistoryResponse> {
  if (env.useStaticData) return getStaticAttendanceHistory(query);
  if (env.apiUrl) {
    const params = new URLSearchParams();
    if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query?.dateTo) params.set('dateTo', query.dateTo);
    if (query?.page != null) params.set('page', String(query.page));
    if (query?.pageSize != null) params.set('pageSize', String(query.pageSize));
    const qs = params.toString();
    const url = qs ? `/sessions/attendance-history?${qs}` : '/sessions/attendance-history';
    const { data } = await api.get<unknown>(url);
    const raw = data as Record<string, unknown>;
    const items = Array.isArray(raw.items) ? raw.items : [];
    const mapped: AttendanceHistoryEntry[] = items.map((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const session = mapRawToSession((e.session as Record<string, unknown>) ?? {});
      const participantsRaw = Array.isArray(e.participants) ? e.participants : [];
      const participants = participantsRaw.map((p: unknown) =>
        mapRawToParticipant(p as Record<string, unknown>, session.id),
      );
      return { session, participants };
    });
    return {
      items: mapped,
      total: Number(raw.total ?? 0),
      page: Number(raw.page ?? 1),
      pageSize: Number(raw.pageSize ?? 20),
    };
  }
  return getStaticAttendanceHistory(query);
}
