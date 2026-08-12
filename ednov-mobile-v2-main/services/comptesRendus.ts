import { env } from '@/config/env';
import api from '@/services/api';
import { fetchTutorDashboard } from '@/services/sessions';
import { getStaticComptesRendus } from '@/data/staticData';
import { getDisplayAuthorFeedback, normalizeAuthorFeedbacks } from '@/utils/report-author-feedback';
import type { CompteRendu, CompteRenduAuthorFeedback, CompteRenduFeeling } from '@/types/compteRendu';
import type { SessionReportParticipantAttendanceItem } from '@/utils/sessionReportParticipants';

/** Mutable list when useStaticData: seeded from static data, append on submit. */
let staticCrList: CompteRendu[] | null = null;

function getComptesRendusList(): CompteRendu[] {
  if (!staticCrList) staticCrList = [...getStaticComptesRendus()];
  return staticCrList;
}

function normalizeGeneratedResources(raw: unknown): Array<{ title: string; problem: string; solution: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    if (r != null && typeof r === 'object' && 'title' in r) {
      const o = r as Record<string, unknown>;
      return {
        title: typeof o.title === 'string' ? o.title : '',
        problem: typeof o.problem === 'string' ? o.problem : '',
        solution: typeof o.solution === 'string' ? o.solution : '',
      };
    }
    return { title: '', problem: '', solution: '' };
  });
}

const FEELING_VALUES: CompteRenduFeeling[] = ['very_at_ease', 'rather_at_ease', 'neutral', 'somewhat_difficult', 'difficult'];

function toFeeling(v: unknown): CompteRenduFeeling | null {
  if (v == null || typeof v !== 'string') return null;
  return FEELING_VALUES.includes(v as CompteRenduFeeling) ? (v as CompteRenduFeeling) : null;
}

function parseRatingFromRaw(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseAuthorFeedbacksFromRaw(raw: Record<string, unknown>): CompteRenduAuthorFeedback[] {
  let arr: unknown = raw.authorFeedbacks ?? raw.author_feedbacks;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (item == null || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const idAuteur = o.idAuteur ?? o.id_auteur ?? o.authorId ?? o.author_id ?? o.userId ?? o.user_id;
      if (idAuteur == null) return null;
      return {
        idAuteur: String(idAuteur),
        rating: parseRatingFromRaw(o.rating ?? o.note ?? o.rating_value),
        comment: toStrOrNull(o.comment ?? o.commentaire ?? o.text),
        feeling: toFeeling(o.feeling),
      } satisfies CompteRenduAuthorFeedback;
    })
    .filter((x): x is CompteRenduAuthorFeedback => x != null);
}

/** Backend SessionReport → CompteRendu. */
function mapSessionReportToCompteRendu(raw: Record<string, unknown>): CompteRendu {
  const status = raw.status as string | undefined;
  const submitted = status === 'submitted' || status === 'validated';
  const submittedAt = submitted ? toStrOrNull(raw.updatedAt ?? raw.validatedAt) : null;
  const rawResources = raw.generatedResources ?? raw.generated_resources;
  const validatedAt = toStrOrNull(raw.validatedAt ?? raw.validated_at);
  const validatedById = raw.validatedById ?? raw.validated_by;
  const personsPresent = toStrOrNull(raw.personsPresent ?? raw.persons_present);
  const personsAbsent = toStrOrNull(raw.personsAbsent ?? raw.persons_absent);
  const sidRaw = raw.subjectIds ?? raw.subject_ids;
  const matiereIds = Array.isArray(sidRaw) ? sidRaw.map((x) => String(x)).filter(Boolean) : [];
  const authorId = raw.authorId != null || raw.author_id != null
    ? String(raw.authorId ?? raw.author_id)
    : null;
  const sessionObj =
    raw.session != null && typeof raw.session === 'object'
      ? (raw.session as Record<string, unknown>)
      : null;
  const sessionType =
    sessionObj?.type != null
      ? String(sessionObj.type)
      : raw.sessionType != null
        ? String(raw.sessionType)
        : null;
  const rawSessionDate =
    raw.sessionDate ?? raw.session_date ??
    (sessionObj?.sessionDate ?? sessionObj?.session_date ?? sessionObj?.date);
  const sessionDate = rawSessionDate != null ? String(rawSessionDate) : null;

  const legacyRating =
    raw.rating != null && raw.rating !== '' ? Number(raw.rating) : null;
  const legacyComment = toStrOrNull(raw.comment);
  const legacyFeeling = toFeeling(raw.feeling);

  let authorFeedbacks = parseAuthorFeedbacksFromRaw(raw);
  if (!authorFeedbacks.length && authorId && (legacyRating != null || legacyComment || legacyFeeling)) {
    authorFeedbacks = [
      {
        idAuteur: authorId,
        rating: legacyRating != null && Number.isFinite(legacyRating) ? legacyRating : null,
        comment: legacyComment,
        feeling: legacyFeeling,
      },
    ];
  }

  const legacyNote =
    legacyRating != null && Number.isFinite(legacyRating) ? String(legacyRating) : null;
  const reportLike = {
    authorFeedbacks,
    authorId,
    note: legacyNote,
    commentaire: legacyComment,
    feeling: legacyFeeling,
  };
  authorFeedbacks = normalizeAuthorFeedbacks(reportLike);
  const display = getDisplayAuthorFeedback({ ...reportLike, authorFeedbacks });
  const note = display?.rating != null ? String(display.rating) : null;
  const commentaire = display?.comment ?? null;
  const feeling = display?.feeling ?? null;

  return {
    id: String(raw.id ?? ''),
    sessionId: String(raw.sessionId ?? raw.session_id ?? ''),
    authorId,
    authorFeedbacks,
    sessionType,
    sessionDate: sessionDate || null,
    note,
    matiere: toStrOrNull(raw.subject),
    matiereIds,
    commentaire,
    script: toStrOrNull(raw.script),
    generatedResources: normalizeGeneratedResources(rawResources),
    submittedAt,
    status: (status === 'validated' ? 'validated' : status === 'overdue' ? 'submitted' : (status as CompteRendu['status'])) ?? 'draft',
    validatedById: validatedById != null ? String(validatedById) : null,
    validatedAt: validatedAt ?? null,
    personsPresent: personsPresent ?? null,
    personsAbsent: personsAbsent ?? null,
    feeling,
  };
}

function toStrOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return null;
}

export function authorFeedbacksToApiBody(
  entries: CompteRenduAuthorFeedback[],
): Array<Record<string, unknown>> {
  return entries.map((e) => ({
    idAuteur: e.idAuteur,
    rating: e.rating,
    comment: e.comment,
    feeling: e.feeling,
  }));
}

/** List = all reports (draft + submitted) from GET /sessions/dashboard/tutor when API is set. */
export async function fetchComptesRendus(): Promise<CompteRendu[]> {
  if (env.useStaticData) return getComptesRendusList();
  if (env.apiUrl) {
    const dashboard = await fetchTutorDashboard();
    const list = Array.isArray(dashboard.reports)
      ? dashboard.reports
      : dashboard.reportsToSubmit;
    return (list as Record<string, unknown>[]).map((r) =>
      mapSessionReportToCompteRendu(r)
    );
  }
  return getComptesRendusList();
}

/** GET /sessions/:sessionId/reports */
export async function fetchSessionReports(sessionId: string): Promise<CompteRendu[]> {
  if (env.useStaticData) {
    return getComptesRendusList().filter((c) => c.sessionId === sessionId);
  }
  const { data } = await api.get<unknown>(`/sessions/${sessionId}/reports`);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((r: unknown) => mapSessionReportToCompteRendu(r as Record<string, unknown>));
}

/** GET /sessions/:sessionId/reports/:reportId */
export async function getSessionReport(
  sessionId: string,
  reportId: string
): Promise<CompteRendu | null> {
  if (env.useStaticData) {
    const found = getComptesRendusList().find(
      (c) => c.sessionId === sessionId && c.id === reportId
    );
    return found ?? null;
  }
  try {
    const { data } = await api.get<unknown>(`/sessions/${sessionId}/reports/${reportId}`);
    const mapped = mapSessionReportToCompteRendu((data ?? {}) as Record<string, unknown>);
    return mapped.sessionId ? mapped : { ...mapped, sessionId };
  } catch (err: unknown) {
    const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
    if (status === 403 || status === 404) return null;
    throw err;
  }
}

/** POST /sessions/:sessionId/reports. */
export interface CreateSessionReportPayload {
  authorId: string;
  authorFeedbacks?: CompteRenduAuthorFeedback[];
  subjectIds?: string[];
  status?: 'draft' | 'submitted';
  personsPresent?: string | null;
  personsAbsent?: string | null;
  participants?: SessionReportParticipantAttendanceItem[];
}

export async function createSessionReport(
  sessionId: string,
  payload: CreateSessionReportPayload
): Promise<CompteRendu> {
  const body: Record<string, unknown> = {
    authorId: payload.authorId,
    status: payload.status ?? 'draft',
  };
  if (payload.authorFeedbacks?.length) {
    body.authorFeedbacks = authorFeedbacksToApiBody(payload.authorFeedbacks);
  }
  if (payload.subjectIds !== undefined) body.subjectIds = payload.subjectIds;
  if (payload.participants?.length) body.participants = payload.participants;
  const { data } = await api.post<unknown>(`/sessions/${sessionId}/reports`, body);
  return mapSessionReportToCompteRendu((data ?? {}) as Record<string, unknown>);
}

/** PATCH /sessions/:sessionId/reports/:reportId. */
export interface UpdateSessionReportPayload {
  authorFeedbacks?: CompteRenduAuthorFeedback[];
  subjectIds?: string[];
  script?: string | null;
  status?: 'draft' | 'submitted' | 'validated';
  validatedById?: string | null;
  generatedResources?: { title: string; problem: string; solution: string }[] | null;
  participants?: SessionReportParticipantAttendanceItem[];
}

export async function updateSessionReport(
  sessionId: string,
  reportId: string,
  payload: UpdateSessionReportPayload
): Promise<CompteRendu> {
  const body: Record<string, unknown> = {};
  if (payload.authorFeedbacks?.length) {
    body.authorFeedbacks = authorFeedbacksToApiBody(payload.authorFeedbacks);
  }
  if (payload.subjectIds !== undefined) body.subjectIds = payload.subjectIds;
  if (payload.script !== undefined) body.script = payload.script ?? null;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.validatedById !== undefined) body.validatedById = payload.validatedById ?? null;
  if (payload.generatedResources !== undefined) body.generatedResources = payload.generatedResources ?? null;
  if (payload.participants?.length) body.participants = payload.participants;
  const { data } = await api.patch<unknown>(
    `/sessions/${sessionId}/reports/${reportId}`,
    body
  );
  return mapSessionReportToCompteRendu((data ?? {}) as Record<string, unknown>);
}

/** Payload pour la saisie CR : matières = UUIDs uniquement (backend subjectIds). */
export interface SubmitCompteRenduPayload {
  sessionId: string;
  matiereIds: string[];
  /** Required when env.apiUrl; backend user UUID from GET /users/login */
  authorId?: string | null;
  /** If set, update this report instead of creating (for edit flow). */
  reportId?: string | null;
  /** Slots tuteur/bénévole (prioritaire sur note/commentaire legacy). */
  authorFeedbacks?: CompteRenduAuthorFeedback[];
  /** Legacy mono-auteur : note globale 0-5. */
  note?: string;
  commentaire?: string;
  feeling?: CompteRenduFeeling | null;
  personsPresent?: string | null;
  personsAbsent?: string | null;
  participants?: SessionReportParticipantAttendanceItem[];
}

function resolveSubmitAuthorFeedbacks(payload: SubmitCompteRenduPayload): CompteRenduAuthorFeedback[] {
  if (payload.authorFeedbacks?.length) return payload.authorFeedbacks;
  const authorId = payload.authorId?.trim();
  if (!authorId) return [];
  return [
    {
      idAuteur: authorId,
      rating: parseNoteToRating(payload.note ?? '') ?? null,
      comment: payload.commentaire?.trim() || null,
      feeling: payload.feeling ?? null,
    },
  ];
}

/** Create or update a session report. When apiUrl: calls createSessionReport or updateSessionReport; otherwise mock. */
export async function submitCompteRendu(payload: SubmitCompteRenduPayload): Promise<CompteRendu> {
  if (!env.useStaticData && env.apiUrl && payload.authorId) {
    const subjectIds = [...payload.matiereIds];
    const authorFeedbacks = resolveSubmitAuthorFeedbacks(payload);
    const participants = payload.participants?.length ? payload.participants : undefined;
    const body = {
      authorFeedbacks,
      subjectIds,
      status: 'submitted' as const,
      ...(participants ? { participants } : {}),
    };
    const reportIdFromPayload = (payload.reportId ?? '').trim();
    if (reportIdFromPayload) {
      return updateSessionReport(payload.sessionId, reportIdFromPayload, body);
    }

    try {
      const existing = await fetchSessionReports(payload.sessionId);
      const existingId = existing[0]?.id;
      if (existingId) {
        return updateSessionReport(payload.sessionId, existingId, body);
      }
    } catch {
      // fall back to create
    }

    return createSessionReport(payload.sessionId, {
      authorId: payload.authorId,
      ...body,
    });
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const submittedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00.000Z`;
  const authorFeedbacks = resolveSubmitAuthorFeedbacks(payload);
  const display = authorFeedbacks[0];
  const newCr: CompteRendu = {
    id: `cr-static-${Date.now()}`,
    sessionId: payload.sessionId,
    authorId: payload.authorId ?? null,
    authorFeedbacks,
    note: display?.rating != null ? String(display.rating) : payload.note ?? null,
    matiereIds: [...payload.matiereIds],
    matiere: null,
    commentaire: display?.comment ?? payload.commentaire ?? null,
    personsPresent: payload.personsPresent ?? null,
    personsAbsent: payload.personsAbsent ?? null,
    feeling: display?.feeling ?? payload.feeling ?? null,
    submittedAt,
    status: 'submitted',
  };
  getComptesRendusList().push(newCr);
  return newCr;
}

/** Parse note string to backend rating 1-5. Note globale 0-5: 0 maps to 1; 1-5 as-is. Legacy 0-20 scales to 1-5. */
export function parseNoteToRating(note: string): number | null {
  const n = parseInt(note.trim(), 10);
  if (Number.isNaN(n)) return null;
  if (n >= 1 && n <= 5) return n;
  if (n === 0) return 1;
  if (n >= 6 && n <= 20) return Math.max(1, Math.min(5, Math.round((n / 20) * 5)));
  return null;
}

/** Mark report as validated (VSC action). Calls PATCH with status 'validated' and validatedById. */
export async function validateSessionReport(
  sessionId: string,
  reportId: string,
  validatedById: string
): Promise<CompteRendu> {
  return updateSessionReport(sessionId, reportId, {
    status: 'validated',
    validatedById,
  });
}

/** Mark an existing report as submitted (from CR detail screen). */
export async function submitCrAsSubmitted(cr: CompteRendu): Promise<CompteRendu> {
  if (env.useStaticData) {
    const list = getComptesRendusList();
    const idx = list.findIndex((c) => c.id === cr.id && c.sessionId === cr.sessionId);
    if (idx >= 0) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      list[idx] = {
        ...list[idx],
        submittedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00.000Z`,
        status: 'submitted',
      };
      return list[idx];
    }
    return cr;
  }
  if (env.apiUrl) {
    const authorFeedbacks = normalizeAuthorFeedbacks(cr);
    return updateSessionReport(cr.sessionId, cr.id, {
      status: 'submitted',
      authorFeedbacks: authorFeedbacks.length ? authorFeedbacks : undefined,
      subjectIds: cr.matiereIds ?? [],
    });
  }
  return cr;
}
