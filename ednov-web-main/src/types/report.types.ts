import type { SessionReportFeeling } from '@/constants/session-report-feeling';

export type ReportStatus = 'to_complete' | 'draft' | 'submitted' | 'validated' | 'overdue';

export type { SessionReportFeeling };

export type SessionReportAttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

export interface SessionReportParticipantAttendanceItem {
  participantId: string;
  attendanceStatus: SessionReportAttendanceStatus;
  absenceJustification?: string | null;
  absenceComment?: string | null;
}

/** Évaluation par tuteur/bénévole (backend `author_feedbacks`). */
export interface SessionReportAuthorFeedback {
  idAuteur: string;
  rating: number | null;
  comment: string | null;
  feeling?: SessionReportFeeling | null;
}

export interface SessionReport {
  id: string;
  companyId: string;
  sessionId: string;
  authorId: string;
  authorFeedbacks: SessionReportAuthorFeedback[];
  /** @deprecated Préférer `authorFeedbacks` — conservé si l’API dénormalise encore */
  rating?: number | null;
  comment?: string | null;
  feeling?: SessionReportFeeling | null;
  /**
   * Rétrocompat (texte, ou ancien encodage). Dénormalisé côté serveur quand `subjectIds` est renseigné.
   */
  subject: string | null;
  /** Identifiants de matières (API / colonne `subject_ids`). */
  subjectIds?: string[];
  status: ReportStatus;
  validatedById: string | null;
  validatedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  authorName?: string | null;
  sessionDisplayName?: string | null;
  validatedByName?: string | null;
  _permissions?: Record<string, boolean>;
  author?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
  };
  session?: {
    id: string;
    sessionDate: Date;
    type: string;
    establishment?: { id: string; name: string };
  };
  validatedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface CreateReportDto {
  authorId: string;
  authorFeedbacks?: SessionReportAuthorFeedback[];
  /** @deprecated Utiliser `authorFeedbacks` */
  rating?: number | null;
  comment?: string | null;
  feeling?: SessionReportFeeling | null;
  subject?: string | null;
  subjectIds?: string[];
  status?: ReportStatus;
  authorName?: string | null;
  sessionDisplayName?: string | null;
  participants?: SessionReportParticipantAttendanceItem[];
}

export interface UpdateReportDto {
  authorFeedbacks?: SessionReportAuthorFeedback[];
  rating?: number | null;
  comment?: string | null;
  feeling?: SessionReportFeeling | null;
  subject?: string | null;
  subjectIds?: string[];
  status?: ReportStatus;
  validatedById?: string | null;
  authorName?: string | null;
  sessionDisplayName?: string | null;
  validatedByName?: string | null;
  participants?: SessionReportParticipantAttendanceItem[];
}

export interface ReportFilters {
  statuses: string[];
  ratings: number[];
  dateRange: 'all' | 'week' | 'month' | 'year';
  customDateFrom?: Date;
  customDateTo?: Date;
  sessionTypes?: string[];
  establishmentIds?: string[];
  search?: string;
}

export interface ReportKpis {
  missingReports: number;
  overdueReports: number;
  submittedPendingValidation: number;
  validatedReports: number;
}
