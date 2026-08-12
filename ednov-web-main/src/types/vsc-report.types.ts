import type { VscDailyReport } from './vsc-daily-report.types';

export type VscReportStatus = 'draft' | 'to_fill' | 'submitted' | 'validated';
export type VscReportCategory = 'daily' | 'weekly';

export interface VscReport {
  id: string;
  companyId: string;
  sessionId?: string | null;
  studentId?: string | null;
  volunteerId?: string | null;
  vscId?: string | null;
  establishmentId?: string | null;
  category?: VscReportCategory | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  summary: string | null;
  progressEvaluation: string | null;
  recommendations: string | null;
  status: VscReportStatus;
  sessionsCompleted?: number;
  sessionsClosed?: number;
  sessionsCancelled?: number;
  assignmentsCreated?: number;
  reportsSubmitted?: number;
  reportsPending?: number;
  reportsValidated?: number;
  tutorHours?: number;
  createdAt: Date;
  updatedAt: Date;
  _permissions?: Record<string, boolean>;
  studentName?: string | null;
  volunteerName?: string | null;
  sessionDisplayName?: string | null;
  // Relations (si retournées par backend)
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
  };
  volunteer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
  };
  vsc?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
  };
  session?: {
    id: string;
    sessionDate: Date;
    type: string;
    establishment?: { name: string };
  };
  establishment?: {
    id: string;
    name: string;
  };
  /** Ligne issue de `vsc_daily_reports` (liste journalière). */
  isDailyReport?: boolean;
  dailyPayload?: VscDailyReport;
}

export interface CreateVscReportDto {
  studentId?: string | null;
  volunteerId?: string | null;
  vscId?: string | null;
  category?: VscReportCategory | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  summary?: string | null;
  progressEvaluation?: string | null;
  recommendations?: string | null;
  status?: VscReportStatus;
  sessionsCompleted?: number;
  sessionsClosed?: number;
  sessionsCancelled?: number;
  assignmentsCreated?: number;
  reportsSubmitted?: number;
  reportsPending?: number;
  reportsValidated?: number;
  tutorHours?: number;
  studentName?: string | null;
  volunteerName?: string | null;
  sessionDisplayName?: string | null;
}

export interface UpdateVscReportDto {
  vscId?: string | null;
  category?: VscReportCategory | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  summary?: string | null;
  progressEvaluation?: string | null;
  recommendations?: string | null;
  status?: VscReportStatus;
  sessionsCompleted?: number;
  sessionsClosed?: number;
  sessionsCancelled?: number;
  assignmentsCreated?: number;
  reportsSubmitted?: number;
  reportsPending?: number;
  reportsValidated?: number;
  tutorHours?: number;
  studentName?: string | null;
  volunteerName?: string | null;
  sessionDisplayName?: string | null;
}

export interface VscReportFilters {
  statuses: string[];
  category: 'all' | 'daily' | 'weekly';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  customDateFrom?: Date;
  customDateTo?: Date;
  establishmentId?: string;
  search?: string;
}
