import { apiClient } from './api-client';
import type { VscReport, CreateVscReportDto, UpdateVscReportDto } from '@/types/vsc-report.types';
import type { PaginatedResponse } from './users.service';
import { toLocalDateString } from '@/lib/date-utils';

export const getVscReports = async (sessionId: string): Promise<VscReport[]> => {
  const response = await apiClient.get<VscReport[]>(`/sessions/${sessionId}/vsc-reports`);
  return response.data;
};

export interface GetAllVscReportsParams {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  categories?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  sessionId?: string;
  search?: string;
  establishmentId?: string;
}

export const getAllVscReports = async (
  params?: GetAllVscReportsParams,
): Promise<PaginatedResponse<VscReport>> => {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  params?.categories?.forEach((c) => searchParams.append('categories', c));

  if (params?.dateFrom) searchParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) searchParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.userId) searchParams.append('userId', params.userId);
  if (params?.sessionId) searchParams.append('sessionId', params.sessionId);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.establishmentId) searchParams.append('establishmentId', params.establishmentId);

  const queryString = searchParams.toString();
  const url = queryString ? `/sessions/vsc-reports?${queryString}` : '/sessions/vsc-reports';
  const response = await apiClient.get<PaginatedResponse<VscReport>>(url);
  return response.data;
};

export const getVscReport = async (sessionId: string, reportId: string): Promise<VscReport> => {
  const response = await apiClient.get<VscReport>(`/sessions/${sessionId}/vsc-reports/${reportId}`);
  return response.data;
};

export const createVscReport = async (
  sessionId: string,
  dto: CreateVscReportDto,
): Promise<VscReport> => {
  const response = await apiClient.post<VscReport>(`/sessions/${sessionId}/vsc-reports`, dto);
  return response.data;
};

export const updateVscReport = async (
  sessionId: string,
  reportId: string,
  dto: UpdateVscReportDto,
): Promise<VscReport> => {
  const response = await apiClient.patch<VscReport>(
    `/sessions/${sessionId}/vsc-reports/${reportId}`,
    dto,
  );
  return response.data;
};

export const deleteVscReport = async (sessionId: string, reportId: string): Promise<void> => {
  await apiClient.delete(`/sessions/${sessionId}/vsc-reports/${reportId}`);
};

export const validateVscReport = async (
  sessionId: string,
  reportId: string,
): Promise<VscReport> => {
  const response = await apiClient.patch<VscReport>(
    `/sessions/${sessionId}/vsc-reports/${reportId}/validate`,
  );
  return response.data;
};
