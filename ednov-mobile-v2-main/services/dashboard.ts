import { env } from '@/config/env';

import api from './api';

interface SessionsHoursTotalResponse {
  hoursTotal?: number;
}

/**
 * Realized tutoring hours for the authenticated user (tutor/volunteer/VSC) on the selected period.
 * Uses GET /sessions/hours-total — same scope as report KPIs, not the admin dashboard stat.
 */
export async function fetchDashboardHoursTotal(dateFrom?: string, dateTo?: string): Promise<number> {
  if (env.useStaticData) return 12;
  const params: Record<string, string> = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  const { data } = await api.get<SessionsHoursTotalResponse>('/sessions/hours-total', { params });
  const n = data?.hoursTotal;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
