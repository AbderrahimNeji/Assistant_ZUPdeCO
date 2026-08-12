/**
 * Compte rendu (CR) linked to a session.
 * "À remplir" when submittedAt is null/undefined or status is draft;
 * "Soumis" when submittedAt is set; "Validé" when status is validated.
 */
export type CompteRenduStatus =
  | 'to_complete'
  | 'draft'
  | 'submitted'
  | 'validated'
  | 'overdue';

/** Sentiment pendant la séance (Comment vous êtes-vous senti ?). */
export type CompteRenduFeeling =
  | 'very_at_ease'
  | 'rather_at_ease'
  | 'neutral'
  | 'somewhat_difficult'
  | 'difficult';

/** Évaluation par tuteur/bénévole (backend `author_feedbacks`). */
export interface CompteRenduAuthorFeedback {
  idAuteur: string;
  rating: number | null;
  comment: string | null;
  feeling: CompteRenduFeeling | null;
}

export interface CompteRendu {
  id: string;
  sessionId: string;
  /** Auteur principal du CR (backend `author_id`). */
  authorId?: string | null;
  /** Évaluations par tuteur/bénévole. */
  authorFeedbacks?: CompteRenduAuthorFeedback[];
  /** Type de séance (ex. `whole_class`) si renvoyé par l'API. */
  sessionType?: string | null;
  /** ISO date string of the linked session (e.g. "2026-03-24T10:00:00"), used as display fallback when the session is not in the loaded sessions list. */
  sessionDate?: string | null;
  sessionEstablishment?: string | null;
  /** Note affichée (dérivée de `authorFeedbacks` ou legacy). */
  note?: string | null;
  /** Dénormalisé (backend `subject`) — préférer `matiereIds` pour la vérité métier. */
  matiere?: string | null;
  /** Identifiants matières (backend `subject_ids` / `subjectIds`). */
  matiereIds?: string[];
  /** Commentaire affiché (dérivé de `authorFeedbacks` ou legacy). */
  commentaire?: string | null;
  /** AI-generated session script with [Tuteur]/[Élève] dialogue (optional). */
  script?: string | null;
  /** AI-generated pedagogical resources (title, problem, solution) saved with the report. */
  generatedResources?: Array<{ title: string; problem: string; solution: string }> | null;
  /** ISO date string when submitted; null if draft */
  submittedAt?: string | null;
  status?: CompteRenduStatus | null;
  /** User ID who validated the report (VSC). */
  validatedById?: string | null;
  /** ISO date when validated. */
  validatedAt?: string | null;
  /** Personnes présentes (saisie libre). */
  personsPresent?: string | null;
  /** Personnes absentes (saisie libre). */
  personsAbsent?: string | null;
  /** Ressenti affiché (dérivé de `authorFeedbacks` ou legacy). */
  feeling?: CompteRenduFeeling | null;
}

export function isSubmitted(cr: CompteRendu): boolean {
  return cr.status === 'submitted' || cr.status === 'validated' || (cr.submittedAt != null && cr.submittedAt !== '');
}

export function isValidated(cr: CompteRendu): boolean {
  return cr.status === 'validated';
}
