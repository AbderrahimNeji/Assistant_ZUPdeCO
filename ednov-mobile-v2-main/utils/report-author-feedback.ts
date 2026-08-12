import type { CompteRendu, CompteRenduAuthorFeedback, CompteRenduFeeling } from '@/types/compteRendu';
import type { Session, SessionParticipant } from '@/types/session';

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
  CompteRendu,
  'authorFeedbacks' | 'authorId' | 'note' | 'commentaire' | 'feeling' | 'sessionType'
>;

function resolveSessionType(
  report: Pick<CompteRendu, 'sessionType'>,
  session?: SessionForReport,
): string | null | undefined {
  const raw = report.sessionType ?? session?.type ?? null;
  if (raw == null) return null;
  return String(raw).toLowerCase().trim();
}

function countNonStudentParticipants(session?: SessionForReport): number {
  return (
    session?.participants?.filter((p) => p.role === 'tutor' || p.role === 'volunteer').length ?? 0
  );
}

/** Choisit l’entrée affichée sans repasser par `normalizeAuthorFeedbacks` (évite la récursion). */
function pickDisplayAuthorFeedbackFromEntries(
  entries: CompteRenduAuthorFeedback[],
  authorId: string,
): CompteRenduAuthorFeedback | null {
  if (!entries.length) return null;
  return (
    entries.find((e) => e.idAuteur === authorId && e.rating != null) ??
    entries.find((e) => e.idAuteur === authorId) ??
    entries.find((e) => e.rating != null) ??
    entries[0]
  );
}

/** Fusionne note/commentaire plats (dénormalisation API) dans les slots concernés. */
function enrichAuthorFeedbacksFromLegacy(
  entries: CompteRenduAuthorFeedback[],
  report: Pick<CompteRendu, 'authorId' | 'note' | 'commentaire' | 'feeling'>,
): CompteRenduAuthorFeedback[] {
  if (!entries.length) return entries;
  const legacyR = legacyRating(report);
  const legacyC = report.commentaire?.trim();
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

type ReportLegacyAuthorFields = Pick<CompteRendu, 'authorId' | 'note'>;

function resolveEntryForCompletion(
  entry: CompteRenduAuthorFeedback,
  report: ReportLegacyAuthorFields,
): CompteRenduAuthorFeedback {
  const authorId = report.authorId ?? '';
  if (!authorId || entry.idAuteur !== authorId) return entry;
  return {
    ...entry,
    rating: entry.rating ?? legacyRating(report),
    feeling: entry.feeling,
  };
}

/** Matières au niveau du CR (partagées entre les tuteurs). */
export function hasReportMatiere(
  report: Pick<CompteRendu, 'matiereIds' | 'matiere'>,
): boolean {
  return (
    (Array.isArray(report.matiereIds) && report.matiereIds.length > 0) ||
    !!report.matiere?.trim()
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

function legacyRating(report: ReportLike): number | null {
  if (report.note == null || report.note.trim() === '') return null;
  const n = Number.parseInt(report.note.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Normalise les feedbacks (API `authorFeedbacks` ou champs plats legacy). */
export function normalizeAuthorFeedbacks(report: ReportLike): CompteRenduAuthorFeedback[] {
  let entries: CompteRenduAuthorFeedback[];
  if (report.authorFeedbacks?.length) {
    entries = report.authorFeedbacks;
  } else {
    const rating = legacyRating(report);
    const comment = report.commentaire?.trim() || null;
    const feeling = report.feeling ?? null;
    if (rating != null || comment || feeling != null) {
      entries = [
        {
          idAuteur: report.authorId ?? '',
          rating,
          comment,
          feeling,
        },
      ];
    } else {
      return [];
    }
  }
  return enrichAuthorFeedbacksFromLegacy(entries, report);
}

export function getDisplayAuthorFeedback(report: ReportLike): CompteRenduAuthorFeedback | null {
  const arr = normalizeAuthorFeedbacks(report);
  return pickDisplayAuthorFeedbackFromEntries(arr, report.authorId ?? '');
}

/** Moyenne des notes renseignées dans `authorFeedbacks` (1 décimale). */
export function getReportMeanRating(report: ReportLike): number | null {
  const legacyFields: ReportLegacyAuthorFields = {
    authorId: report.authorId,
    note: report.note,
  };
  const ratings = normalizeAuthorFeedbacks(report)
    .map((entry) => resolveEntryForCompletion(entry, legacyFields).rating)
    .filter((r): r is number => hasRequiredAuthorRating(r))
    .map(Number);

  if (ratings.length === 0) return null;
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return Math.round(mean * 10) / 10;
}

/** Note affichée en liste : moyenne des notes des auteurs. */
export function getReportDisplayRating(report: ReportLike): number | null {
  return getReportMeanRating(report);
}

/** Feedback visible / modifiable : uniquement le slot de l'utilisateur connecté (tous rôles). */
export function getAuthorFeedbackForViewer(
  report: ReportLike,
  viewerUserId: string | undefined,
): CompteRenduAuthorFeedback | null {
  if (!viewerUserId) return null;
  const arr = normalizeAuthorFeedbacks(report);
  return arr.find((e) => e.idAuteur === viewerUserId) ?? null;
}

export function filterTutorSectionsForViewer(
  sections: TutorReportSection[],
  viewerUserId: string | undefined,
): TutorReportSection[] {
  if (!viewerUserId) return [];
  return sections.filter((s) => s.authorUserId === viewerUserId);
}

export type SessionForReport = Pick<Session, 'type' | 'participants'>;

/** Ajoute des tuteurs attendus absents de la liste participants (API / UI filtrée). */
export function mergeSessionParticipantsWithTutorUserIds(
  participants: SessionParticipant[],
  tutorUserIds: string[],
  sessionId: string,
): SessionParticipant[] {
  const byUser = new Map(participants.map((p) => [p.userId, p]));
  for (const userId of tutorUserIds) {
    if (!userId || byUser.has(userId)) continue;
    byUser.set(userId, {
      id: `expected-tutor-${userId}`,
      sessionId,
      userId,
      role: 'tutor',
      attendanceStatus: 'pending',
    });
  }
  return [...byUser.values()];
}

type ReportForValidateWait = Pick<
  CompteRendu,
  | 'status'
  | 'authorFeedbacks'
  | 'authorId'
  | 'sessionType'
  | 'note'
  | 'commentaire'
  | 'feeling'
  | 'matiereIds'
  | 'matiere'
>;

export function isMultiAuthorReport(
  session: SessionForReport | undefined,
  report: ReportLike,
): boolean {
  const feedbacks = normalizeAuthorFeedbacks(report);
  if (resolveSessionType(report, session) === 'whole_class' && feedbacks.length > 1) return true;
  if (resolveSessionType(report, session) === 'whole_class') {
    const nonStudents =
      session?.participants?.filter((p) => p.role === 'tutor' || p.role === 'volunteer') ?? [];
    return nonStudents.length > 1;
  }
  return false;
}

/** CR classe entière avec plusieurs tuteurs attendus (slots tuteur dans `authorFeedbacks`). */
export function isWholeClassMultiTutorReport(
  report: ReportForValidateWait,
  session?: SessionForReport,
): boolean {
  if (resolveSessionType(report, session) !== 'whole_class') return false;
  return getTutorSlotsForValidateWait(report, session).length > 1;
}

/** @deprecated Utiliser `normalizeAuthorFeedbacks` — conservé pour compat. */
export function expandAuthorFeedbacksForValidateWait(
  report: ReportForValidateWait,
  _session?: SessionForReport,
): CompteRenduAuthorFeedback[] {
  return normalizeAuthorFeedbacks(report);
}

/** Le tuteur a saisi sa note (suivi « a rédigé »). */
export function hasAuthorFeedbackData(entry: CompteRenduAuthorFeedback | undefined): boolean {
  if (!entry) return false;
  return hasRequiredAuthorRating(entry.rating);
}

/** VSC : modale si au moins un tuteur n’a pas complété sa partie (aligné web). */
export function shouldVscConfirmBeforeValidate(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): boolean {
  return getIncompleteAuthorFeedbacks(report, options).length > 0;
}

export interface TutorReportSection {
  authorUserId: string;
  role: 'tutor' | 'volunteer';
  displayName: string;
  feedback: CompteRenduAuthorFeedback;
}

function participantDisplayName(p: SessionParticipant | undefined): string {
  if (!p) return 'Participant inconnu';
  return (
    p.displayName?.trim() ||
    [p.firstName, p.lastName].filter(Boolean).join(' ') ||
    'Participant inconnu'
  );
}

export function buildTutorReportSections(
  session: SessionForReport | undefined,
  report: ReportLike,
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
        rating: legacyRating(report),
        comment: report.commentaire ?? null,
        feeling: report.feeling ?? null,
      },
    ];
  }

  return feedbacks.map((feedback) => {
    const tutorParticipant = participants.find(
      (p) => p.userId === feedback.idAuteur && (p.role === 'tutor' || p.role === 'volunteer'),
    );
    const role: 'tutor' | 'volunteer' =
      tutorParticipant?.role === 'volunteer' ? 'volunteer' : 'tutor';
    return {
      authorUserId: feedback.idAuteur,
      role,
      displayName: participantDisplayName(tutorParticipant),
      feedback,
    };
  });
}

/**
 * Slot tuteur considéré comme ayant rédigé sa partie (suivi VSC).
 * Critère unique : note du slot renseignée (1–5).
 */
export function isAuthorFeedbackSlotComplete(
  entry: CompteRenduAuthorFeedback,
  report: Pick<CompteRendu, 'authorId' | 'note'>,
): boolean {
  const resolved = resolveEntryForCompletion(entry, report);
  return hasRequiredAuthorRating(resolved.rating);
}

export type ValidateWaitOptions = {
  session?: SessionForReport;
  /** Exclut le slot du VSC connecté (bénévole) du décompte « tuteurs ». */
  viewerUserId?: string;
};

/** Slots attendus pour la validation VSC : tuteurs uniquement (pas les bénévoles/VSC). */
function getTutorSlotsForValidateWait(
  report: ReportForValidateWait,
  session?: SessionForReport,
  viewerUserId?: string,
): CompteRenduAuthorFeedback[] {
  const participants = session?.participants ?? [];
  return normalizeAuthorFeedbacks(report).filter((entry) => {
    if (viewerUserId && entry.idAuteur === viewerUserId) return false;
    if (!participants.length) return true;
    const p = participants.find((x) => x.userId === entry.idAuteur);
    if (!p) return true;
    return p.role === 'tutor';
  });
}

/** Slots tuteur sans note (non considérés comme ayant rédigé). */
export function getIncompleteAuthorFeedbacks(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): CompteRenduAuthorFeedback[] {
  const session = options?.session;
  if (!isWholeClassMultiTutorReport(report, session)) return [];
  return getTutorSlotsForValidateWait(report, session, options?.viewerUserId).filter(
    (entry) => !isAuthorFeedbackSlotComplete(entry, report),
  );
}

export function areAllTutorFeedbacksComplete(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): boolean {
  return getIncompleteAuthorFeedbacks(report, options).length === 0;
}

function isReportPendingValidation(report: ReportForValidateWait): boolean {
  if (report.status === 'validated') return false;
  return report.status === 'submitted';
}

export function shouldShowValidateWaitHint(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): boolean {
  if (!isReportPendingValidation(report)) return false;
  return shouldVscConfirmBeforeValidate(report, options);
}

function formatMissingTutorsLine(incompleteCount: number): string {
  if (incompleteCount === 1) {
    return "1 tuteur n'a pas encore renseigné sa partie du compte rendu.";
  }
  return `${incompleteCount} tuteurs n'ont pas encore renseigné leur partie du compte rendu.`;
}

export function shouldShowValidateWaitModal(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): boolean {
  return shouldShowValidateWaitHint(report, options);
}

export function getVscWaitForAllTutorsModalDescription(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): string {
  const incomplete = getIncompleteAuthorFeedbacks(report, options);
  const missing = formatMissingTutorsLine(incomplete.length);
  return `${missing}\n\nIl est recommandé d'attendre que chaque tuteur ait renseigné le compte rendu avant de le valider.\n\nVoulez-vous valider ce compte rendu malgré tout ?`;
}

export function getVscWaitForAllTutorsBannerText(
  report: ReportForValidateWait,
  options?: ValidateWaitOptions,
): string | null {
  if (!shouldShowValidateWaitHint(report, options)) return null;
  const incomplete = getIncompleteAuthorFeedbacks(report, options);
  return `${formatMissingTutorsLine(incomplete.length)} Il est recommandé d'attendre que chaque tuteur ait renseigné le compte rendu avant de le valider.`;
}

export interface TutorFeedbackFormValue {
  note: string;
  commentaire: string;
  feeling: CompteRenduFeeling | null;
}

export function feedbackToFormValue(f: CompteRenduAuthorFeedback): TutorFeedbackFormValue {
  return {
    note: f.rating != null ? String(f.rating) : '',
    commentaire: f.comment ?? '',
    feeling: f.feeling,
  };
}

/** Fusionne la carte auteur (éventuellement vide) avec les champs du formulaire affiché. */
export function mergeActorFormValue(
  fromMap: TutorFeedbackFormValue | undefined,
  local: TutorFeedbackFormValue,
): TutorFeedbackFormValue {
  if (!fromMap) return local;
  return {
    note: fromMap.note?.trim() ? fromMap.note : local.note,
    commentaire: fromMap.commentaire?.trim() ? fromMap.commentaire : local.commentaire,
    feeling: fromMap.feeling ?? local.feeling,
  };
}

export function resolveActorFormValue(
  multiAuthor: boolean,
  actorId: string,
  feedbackByAuthor: Map<string, TutorFeedbackFormValue>,
  local: TutorFeedbackFormValue,
): TutorFeedbackFormValue {
  if (!multiAuthor || !actorId) return local;
  return mergeActorFormValue(feedbackByAuthor.get(actorId), local);
}

export function formValueToAuthorFeedback(
  idAuteur: string,
  v: TutorFeedbackFormValue,
  parseNote: (note: string) => number | null,
): CompteRenduAuthorFeedback {
  return {
    idAuteur,
    rating: parseNote(v.note),
    comment: v.commentaire.trim() || null,
    feeling: v.feeling,
  };
}
