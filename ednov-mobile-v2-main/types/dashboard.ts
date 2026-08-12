/**
 * Dashboard period and KPI types.
 * KPIs can be derived from sessions (Phase 2b) or from GET /reporting/dashboard later.
 */
export type DashboardPeriod = 'week' | 'month' | 'quarter' | 'semester' | 'school-year';

export interface DashboardKpis {
  sessionsCount: number;
  studentsCount: number;
  crCompleted: number;
  crLate: number;
  /** CR not yet submitted (missing + overdue) for N1 reminder banner */
  crToSubmit: number;
  hoursValidated: number;
}
