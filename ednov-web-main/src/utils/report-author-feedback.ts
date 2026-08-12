import type { SessionReport, SessionReportAuthorFeedback } from '@/types/report.types';
import type {
  SessionParticipant,
  SessionType,
  SessionWithParticipants,
} from '@/types/session.types';

/** Comptes VSC en base : code `volunteer` (label UI « VSC ») ou `vsc`. */
const PRIVILEGED_REPORT_EDITOR_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGER',
  'COORDINATOR',
  'VSC',
  'VOLUNTEER',
] as const;

export function isPrivilegedReportEditor(roleCodes: string[] | undefined): boolean {
  if (!roleCodes?.length) return false;
  const upper = new Set(roleCodes.map((c) => (c ?? '').toUpperCase()));
  return PRIVILEGED_REPORT_EDITOR_ROLES.some((r) => upper.has(r));
}

type ReportLike = Pick<
  SessionReport,
  'authorFeedbacks' | 'authorId' | 'rating' | 'comment' | 'feeling'
>;

function resolveSessionType(
  report: Pick<SessionReport, 'session'>,
  session?: SessionForReport,
): string | null | undefined {
  const raw = report.session?.type ?? session?.type ?? null;
  if (raw == null) return null;
  return String(raw).toLowerCase().trim();
}

function pickDisplayAuthorFeedbackFromEntries(
  entries: SessionReportAuthorFeedback[],
  authorId: string,
): SessionReportAuthorFeedback | null {
  if (!entries.length) return null;
  return (
    entries.find((e) => e.idAuteur === authorId && e.rating != null) ??
    entries.find((e) => e.idAuteur === authorId) ??
    entries.find((e) => e.rating != null) ??
    entries[0]
  );
}

/** Fusionne rating/comment plats (dénormalisation API) dans les slots concernés. */
function enrichAuthorFeedbacksFromLegacy(
  entries: SessionReportAuthorFeedback[],
  report: Pick<SessionReport, 'authorId' | 'rating' | 'comment' | 'feeling'>,
): SessionReportAuthorFeedback[] {
  if (!entries.length) return entries;
  const legacyR = report.rating ?? null;
  const legacyC = report.comment?.trim();
  const legacyF = report.feeling ?? null;
  if (legacyR == null && !legacyC && legacyF == null) return entries;
  const authorId = report.authorId ?? '';
  const display = pickDisplayAuthorFeedbackFromEntries(entries, authorId);
  const targetIds = new Set(
    [authorId, display?.idAuteur].filter((id): id is string => Boolean(id)),
  );
  if (!targetIds.size) return entries;
  return entries.map((e) =>
    targetIds.has(e.idAuteur)
      ? {
          idAuteur: e.idAuteur,
          rating: e.rating ?? legacyR,
          comment: e.comment?.trim() ? e.comment : legacyC || null,
          feeling: e.feeling ?? legacyF,
        }
      : e,
  );
}

type ReportLegacyAuthorFields = Pick<SessionReport, 'authorId' | 'rating'>;

function resolveEntryForCompletion(
  entry: SessionReportAuthorFeedback,
  report: ReportLegacyAuthorFields,
): SessionReportAuthorFeedback {
  const authorId = report.authorId ?? '';
  if (!authorId || entry.idAuteur !== authorId) return entry;
  return {
    ...entry,
    rating: entry.rating ?? report.rating ?? null,
  };
}

/** Matières au niveau du CR (partagées entre les tuteurs). */
export function hasReportSubjects(report: Pick<SessionReport, 'subjectIds' | 'subject'>): boolean {
  return (
    (Array.isArray(report.subjectIds) && report.subjectIds.length > 0) || !!report.subject?.trim()
  );
}

/** Note obligatoire du slot (backend : `entry.rating` truthy, DTO 1–5). */
export function hasRequiredAuthorRating(rating: number | null | undefined): boolean {
  return rating != null && Number.isFinite(Number(rating)) && Number(rating) > 0;
}

/** Commentaire obligatoire du slot (backend : `entry.comment?.trim()`). */
export function hasRequiredAuthorComment(comment: string | null | undefined): boolean {
  return !!comment?.trim();
}

/** Normalise les feedbacks (API `authorFeedbacks` ou champs plats legacy). */
export function normalizeAuthorFeedbacks(report: ReportLike): SessionReportAuthorFeedback[] {
  let entries: SessionReportAuthorFeedback[];
  if (report.authorFeedbacks?.length) {
    entries = report.authorFeedbacks;
  } else if (report.rating != null || report.comment?.trim() || report.feeling != null) {
    entries = [
      {
        idAuteur: report.authorId,
        rating: report.rating ?? null,
        comment: report.comment ?? null,
        feeling: report.feeling ?? null,
      },
    ];
  } else {
    return [];
  }
  return enrichAuthorFeedbacksFromLegacy(entries, report);
}

/** Entrée affichée (auteur principal / export backend `getDisplayAuthorFeedback`). */
export function getDisplayAuthorFeedback(report: ReportLike): SessionReportAuthorFeedback | null {
  const arr = normalizeAuthorFeedbacks(report);
  return pickDisplayAuthorFeedbackFromEntries(arr, report.authorId ?? '');
}

/** Moyenne des notes renseignées dans `authorFeedbacks` (1 décimale). */
export function getReportMeanRating(
  report: Pick<SessionReport, 'authorFeedbacks' | 'authorId' | 'rating' | 'comment' | 'feeling'>,
): number | null {
  const legacyFields: ReportLegacyAuthorFields = {
    authorId: report.authorId,
    rating: report.rating ?? null,
  };
  const ratings = normalizeAuthorFeedbacks(report)
    .map((entry) => resolveEntryForCompletion(entry, legacyFields).rating)
    .filter((r): r is number => hasRequiredAuthorRating(r))
    .map(Number);

  if (ratings.length === 0) return null;
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return Math.round(mean * 10) / 10;
}

/** Note affichée en liste / cartes : moyenne des notes des auteurs. */
export function getReportDisplayRating(
  report: Pick<SessionReport, 'authorFeedbacks' | 'authorId' | 'rating' | 'comment' | 'feeling'>,
): number | null {
  return getReportMeanRating(report);
}

export function isMultiAuthorReport(
  session: Pick<SessionWithParticipants, 'type'> | undefined,
  report: Pick<SessionReport, 'authorFeedbacks' | 'authorId' | 'rating' | 'comment' | 'feeling'>,
): boolean {
  const feedbacks = normalizeAuthorFeedbacks(report);
  if (session?.type === 'whole_class' && feedbacks.length > 1) return true;
  if (session?.type === 'whole_class') {
    const nonStudents =
      session && 'participants' in session
        ? ((session as SessionWithParticipants).participants?.filter((p) => p.role !== 'student') ??
          [])
        : [];
    return nonStudents.length > 1;
  }
  return false;
}

export interface TutorReportSection {
  authorUserId: string;
  role: 'tutor' | 'volunteer';
  displayName: string;
  feedback: SessionReportAuthorFeedback;
  tutorParticipant?: SessionParticipant;
  studentParticipants: SessionParticipant[];
}

function participantDisplayName(p: SessionParticipant | undefined): string {
  if (!p?.user) return 'Participant inconnu';
  const u = p.user;
  return (
    u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Participant inconnu'
  );
}

export function buildTutorReportSections(
  session: SessionWithParticipants | undefined,
  report: Pick<SessionReport, 'authorFeedbacks' | 'authorId' | 'rating' | 'comment' | 'feeling'>,
): TutorReportSection[] {
  let feedbacks = normalizeAuthorFeedbacks(report);
  const participants = session?.participants ?? [];

  if (!feedbacks.length && session?.type === 'whole_class') {
    const nonStudents = participants
      .filter((p) => p.role !== 'student')
      .sort((a, b) => {
        const order = { tutor: 0, volunteer: 1, student: 99 };
        const ra = order[a.role as keyof typeof order] ?? 2;
        const rb = order[b.role as keyof typeof order] ?? 2;
        if (ra !== rb) return ra - rb;
        return a.userId.localeCompare(b.userId);
      });
    feedbacks = nonStudents.map((p) => ({
      idAuteur: p.userId,
      rating: null,
      comment: null,
      feeling: null,
    }));
  }

  if (!feedbacks.length && report.authorId) {
    feedbacks = [
      {
        idAuteur: report.authorId,
        rating: report.rating ?? null,
        comment: report.comment ?? null,
        feeling: report.feeling ?? null,
      },
    ];
  }

  const pairs = session?.studentTutorPairs ?? [];

  const studentIdsByTutor = new Map<string, string[]>();
  for (const pair of pairs) {
    const list = studentIdsByTutor.get(pair.tutorUserId) ?? [];
    if (!list.includes(pair.studentUserId)) {
      list.push(pair.studentUserId);
      studentIdsByTutor.set(pair.tutorUserId, list);
    }
  }

  return feedbacks.map((feedback) => {
    const tutorParticipant = participants.find(
      (p) => p.userId === feedback.idAuteur && (p.role === 'tutor' || p.role === 'volunteer'),
    );
    const role: 'tutor' | 'volunteer' =
      tutorParticipant?.role === 'volunteer' ? 'volunteer' : 'tutor';
    const studentUserIds = studentIdsByTutor.get(feedback.idAuteur) ?? [];
    const studentParticipants = studentUserIds
      .map((uid) => participants.find((p) => p.userId === uid && p.role === 'student'))
      .filter((p): p is SessionParticipant => !!p);

    return {
      authorUserId: feedback.idAuteur,
      role,
      displayName: participantDisplayName(tutorParticipant),
      feedback,
      tutorParticipant,
      studentParticipants,
    };
  });
}

/** Élèves de la séance non listés sous un binôme tuteur (classe entière). */
export function getUnmatchedStudentsForReport(
  session: SessionWithParticipants | undefined,
  sections: TutorReportSection[],
): SessionParticipant[] {
  const participants = session?.participants ?? [];
  const matchedStudentIds = new Set(
    sections.flatMap((s) => s.studentParticipants.map((p) => p.userId)),
  );

  return participants.filter((p) => p.role === 'student' && !matchedStudentIds.has(p.userId));
}

export function getUnmatchedStudentsSectionTitle(count: number): string {
  if (count === 1) return 'Élève';
  return `Élèves (${count})`;
}

/** @deprecated Utiliser `getUnmatchedStudentsForReport`. */
export function getUnmatchedReportParticipants(
  session: SessionWithParticipants | undefined,
  sections: TutorReportSection[],
): SessionParticipant[] {
  return getUnmatchedStudentsForReport(session, sections);
}

export type SessionForReport = Pick<SessionWithParticipants, 'type' | 'participants'>;

export type ValidateWaitOptions = {
  session?: SessionForReport;
  /** Exclut le slot du VSC connecté (bénévole) du décompte « tuteurs ». */
  viewerUserId?: string;
};

type ReportForValidateWait = Pick<
  SessionReport,
  | 'status'
  | 'authorFeedbacks'
  | 'authorId'
  | 'rating'
  | 'comment'
  | 'feeling'
  | 'subjectIds'
  | 'subject'
  | 'session'
>;

/**
 * Slot tuteur considéré comme ayant rédigé sa partie (suivi VSC).
 * Critère unique : note du slot renseignée (1–5).
 */
export function isAuthorFeedbackSlotComplete(
  entry: SessionReportAuthorFeedback,
  report: Pick<SessionReport, 'authorId' | 'rating'>,
): boolean {
  const resolved = resolveEntryForCompletion(entry, report);
  return hasRequiredAuthorRating(resolved.rating);
}

/** Slots attendus pour la validation VSC : tuteurs uniquement (pas les bénévoles/VSC). */
function getTutorSlotsForValidateWait(
  report: ReportForValidateWait,
  session?: SessionForReport,
  viewerUserId?: string,
): SessionReportAuthorFeedback[] {
  const participants = session?.participants ?? [];
  return normalizeAuthorFeedbacks(report).filter((entry) => {
    if (viewerUserId && entry.idAuteur === viewerUserId) return false;
    if (!participants.length) return true;
    const p = participants.find((x) => x.userId === entry.idAuteur);
    if (!p) return true;
    return p.role === 'tutor';
  });
}

/** CR classe entière avec plusieurs tuteurs attendus (slots tuteur dans `authorFeedbacks`). */
export function isWholeClassMultiTutorReport(
  report: ReportForValidateWait,
  session?: SessionForReport,
): boolean {
  if (resolveSessionType(report, session) !== 'whole_class') return false;
  return getTutorSlotsForValidateWait(report, session).length > 1;
}

/** Tous les tuteurs ont renseigné leur partie du CR. */
export function areAllTutorFeedbacksComplete(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): boolean {
  return getIncompleteAuthorFeedbacks(report, options).length === 0;
}

/** Slots tuteur sans note (non considérés comme ayant rédigé). */
export function getIncompleteAuthorFeedbacks(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): SessionReportAuthorFeedback[] {
  const session = options?.session;
  if (!isWholeClassMultiTutorReport(report, session)) return [];
  return getTutorSlotsForValidateWait(report, session, options?.viewerUserId).filter(
    (entry) => !isAuthorFeedbackSlotComplete(entry, report),
  );
}

/**
 * Modale d’avertissement VSC : séance classe entière, CR soumis,
 * au moins un tuteur n’a pas complété sa partie.
 */
export function shouldShowValidateWaitModal(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): boolean {
  if (report.status !== 'submitted') return false;
  if (!isWholeClassMultiTutorReport(report, options?.session)) return false;
  return getIncompleteAuthorFeedbacks(report, options).length > 0;
}

function formatMissingTutorsLine(incompleteCount: number): string {
  if (incompleteCount === 1) {
    return "1 tuteur n'a pas encore renseigné sa partie du compte rendu.";
  }
  return `${incompleteCount} tuteurs n'ont pas encore renseigné leur partie du compte rendu.`;
}

/** Texte de la modale (confirmer / annuler) lorsque tous les tuteurs n’ont pas rédigé le CR. */
export function getVscWaitForAllTutorsModalDescription(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): string {
  const incomplete = getIncompleteAuthorFeedbacks(report, options);
  const missing = formatMissingTutorsLine(incomplete.length);

  return `${missing}\n\nIl est recommandé d'attendre que chaque tuteur ait renseigné le compte rendu avant de le valider.\n\nVoulez-vous valider ce compte rendu malgré tout ?`;
}

/** Texte du bandeau d’information sur la fiche détail. */
export function getVscWaitForAllTutorsBannerText(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): string | null {
  if (!shouldShowValidateWaitModal(report, options)) return null;
  const incomplete = getIncompleteAuthorFeedbacks(report, options);
  return `${formatMissingTutorsLine(incomplete.length)} Il est recommandé d'attendre que chaque tuteur ait renseigné le compte rendu avant de le valider.`;
}

/** Contexte séance (participants) pour la validation VSC — à fournir depuis la fiche ou l’API séance. */
export function buildValidateWaitOptions(
  report: ReportForValidateWait,
  session?: SessionWithParticipants | null,
  viewerUserId?: string,
): ValidateWaitOptions {
  return {
    session: session
      ? { type: session.type, participants: session.participants }
      : report.session?.type
        ? {
            type: report.session.type as SessionType,
            participants: undefined,
          }
        : undefined,
    viewerUserId,
  };
}
