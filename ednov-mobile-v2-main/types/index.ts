/**
 * Shared types aligned with EdNov domain and API.
 * Refine when API contracts are fixed.
 */

export interface Actor {
  id: string;
  type: string;
  tenantId: string;
  userId?: string;
  displayName?: string;
}

export interface Session {
  id: string;
  date: string;
  room?: string;
  establishmentId?: string;
  establishmentName?: string;
  status?: string;
}

export interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
}

export interface CompteRendu {
  id: string;
  sessionId: string;
  note?: number;
  matiere?: string;
  comment?: string;
  submittedAt?: string;
}

export interface KpiSummary {
  sessionsCount?: number;
  studentsCount?: number;
  crCompleted?: number;
  crLate?: number;
  validatedHours?: number;
}
