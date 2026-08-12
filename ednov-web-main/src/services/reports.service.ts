import { XLSX_MIME } from '@/constants/mime-types';
import { apiClient } from './api-client';
import type {
  SessionReport,
  CreateReportDto,
  UpdateReportDto,
  ReportKpis,
} from '@/types/report.types';
import type { PaginatedResponse } from './users.service';
import { toLocalDateString } from '@/lib/date-utils';

export const getReports = async (sessionId: string): Promise<SessionReport[]> => {
  const response = await apiClient.get<SessionReport[]>(`/sessions/${sessionId}/reports`);
  return response.data;
};

export interface GetAllReportsParams {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  ratings?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  sessionTypes?: string[];
  establishmentIds?: string[];
  tutorId?: string;
  participantId?: string;
  sessionId?: string;
  search?: string;
}

export const getAllReports = async (
  params?: GetAllReportsParams,
): Promise<PaginatedResponse<SessionReport>> => {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  params?.ratings?.forEach((r) => searchParams.append('ratings', r.toString()));
  params?.sessionTypes?.forEach((t) => searchParams.append('sessionTypes', t));
  params?.establishmentIds?.forEach((id) => searchParams.append('establishmentIds', id));

  if (params?.dateFrom) searchParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) searchParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.tutorId) searchParams.append('tutorId', params.tutorId);
  if (params?.participantId) searchParams.append('participantId', params.participantId);
  if (params?.sessionId) searchParams.append('sessionId', params.sessionId);
  if (params?.search) searchParams.append('search', params.search);

  const queryString = searchParams.toString();
  const url = queryString ? `/sessions/reports?${queryString}` : '/sessions/reports';
  const response = await apiClient.get<PaginatedResponse<SessionReport>>(url);
  return response.data;
};

export const getReport = async (sessionId: string, reportId: string): Promise<SessionReport> => {
  const response = await apiClient.get<SessionReport>(`/sessions/${sessionId}/reports/${reportId}`);
  return response.data;
};

export const createReport = async (
  sessionId: string,
  dto: CreateReportDto,
): Promise<SessionReport> => {
  const response = await apiClient.post<SessionReport>(`/sessions/${sessionId}/reports`, dto);
  return response.data;
};

export const updateReport = async (
  sessionId: string,
  reportId: string,
  dto: UpdateReportDto,
): Promise<SessionReport> => {
  const response = await apiClient.patch<SessionReport>(
    `/sessions/${sessionId}/reports/${reportId}`,
    dto,
  );
  return response.data;
};

export const deleteReport = async (sessionId: string, reportId: string): Promise<void> => {
  await apiClient.delete(`/sessions/${sessionId}/reports/${reportId}`);
};

export const validateReport = async (
  sessionId: string,
  reportId: string,
): Promise<SessionReport> => {
  const response = await apiClient.patch<SessionReport>(
    `/sessions/${sessionId}/reports/${reportId}/validate`,
  );
  return response.data;
};

export const getReportKpis = async (): Promise<ReportKpis> => {
  const response = await apiClient.get<ReportKpis>('/sessions/report-kpis');
  return response.data;
};

/** Export session reports as Excel (.xlsx). */
export const exportReportsExcel = async (
  params?: Omit<GetAllReportsParams, 'page' | 'pageSize'>,
): Promise<void> => {
  const searchParams = new URLSearchParams();
  searchParams.append('exportExcel', 'true');

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  params?.ratings?.forEach((r) => searchParams.append('ratings', r.toString()));
  params?.sessionTypes?.forEach((t) => searchParams.append('sessionTypes', t));
  params?.establishmentIds?.forEach((id) => searchParams.append('establishmentIds', id));

  if (params?.dateFrom) searchParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) searchParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.tutorId) searchParams.append('tutorId', params.tutorId);
  if (params?.participantId) searchParams.append('participantId', params.participantId);
  if (params?.sessionId) searchParams.append('sessionId', params.sessionId);
  if (params?.search) searchParams.append('search', params.search);

  const response = await apiClient.get(`/sessions/reports?${searchParams.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};
