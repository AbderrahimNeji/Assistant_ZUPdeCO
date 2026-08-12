export type VscDailyReportStatus = 'to_fill' | 'submitted' | 'validated';

export interface VscDailyReportEstablishment {
  id: string;
  name: string;
}

export interface VscDailyReportUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
}

export interface VscDailyReportSessionRef {
  id: string;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  type?: string | null;
}

/** Single VSC daily report row (backend `vsc_daily_reports`). */
export interface VscDailyReport {
  id: string;
  companyId: string;
  establishmentId: string;
  reportDate: string;
  vscUserId: string;
  rating: number | null;
  comment: string | null;
  status: VscDailyReportStatus;
  visibleAt: string;
  availabilityNotifiedAt: string | null;
  unlockSessionId: string | null;
  generatedAt: string;
  submittedAt: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  establishment?: VscDailyReportEstablishment | null;
  vscUser?: VscDailyReportUser | null;
  unlockSession?: VscDailyReportSessionRef | null;
}

export interface UpdateVscDailyReportDto {
  rating?: number | null;
  comment?: string | null;
  status?: 'to_fill' | 'submitted';
}
