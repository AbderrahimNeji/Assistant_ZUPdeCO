import { XLSX_MIME } from '@/constants/mime-types';
import { apiClient } from './api-client';
import type { PaginatedResponse } from './users.service';
import type { UpdateVscDailyReportDto, VscDailyReport } from '@/types/vsc-daily-report.types';

export interface GetAllVscDailyReportsParams {
  page?: number;
  pageSize?: number;
  establishmentId?: string;
  reportDate?: string;
  reportDateFrom?: string;
  reportDateTo?: string;
  status?: 'to_fill' | 'submitted' | 'validated';
  statuses?: ('to_fill' | 'submitted' | 'validated')[];
  /** Prénom, nom ou email du VSC (liste journalière). */
  search?: string;
  /** Voir backend : pour le volontaire, inclure les lignes avant `visibleAt` (ex. panneau avec cadenas). */
  includeNotYetVisible?: boolean;
}

export type ExportVscDailyReportsParams = Omit<GetAllVscDailyReportsParams, 'page' | 'pageSize'>;

export const getAllVscDailyReports = async (
  params?: GetAllVscDailyReportsParams,
): Promise<PaginatedResponse<VscDailyReport>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
  if (params?.establishmentId) searchParams.append('establishmentId', params.establishmentId);
  if (params?.reportDate) searchParams.append('reportDate', params.reportDate);
  if (params?.reportDateFrom) searchParams.append('reportDateFrom', params.reportDateFrom);
  if (params?.reportDateTo) searchParams.append('reportDateTo', params.reportDateTo);
  if (params?.status) searchParams.append('status', params.status);
  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.includeNotYetVisible) searchParams.append('includeNotYetVisible', 'true');
  const qs = searchParams.toString();
  const url = qs ? `/sessions/vsc-daily-reports?${qs}` : '/sessions/vsc-daily-reports';
  const response = await apiClient.get<PaginatedResponse<VscDailyReport>>(url);
  return response.data;
};

/** Export daily VSC reports as Excel (.xlsx); filters must match {@link getAllVscDailyReports}. */
export const exportVscDailyReportsExcel = async (
  params?: ExportVscDailyReportsParams,
): Promise<void> => {
  const searchParams = new URLSearchParams();
  searchParams.append('exportExcel', 'true');
  if (params?.establishmentId) searchParams.append('establishmentId', params.establishmentId);
  if (params?.reportDate) searchParams.append('reportDate', params.reportDate);
  if (params?.reportDateFrom) searchParams.append('reportDateFrom', params.reportDateFrom);
  if (params?.reportDateTo) searchParams.append('reportDateTo', params.reportDateTo);
  if (params?.status) searchParams.append('status', params.status);
  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.includeNotYetVisible) searchParams.append('includeNotYetVisible', 'true');

  const response = await apiClient.get(`/sessions/vsc-daily-reports?${searchParams.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vsc-daily-reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

export const getVscDailyReport = async (reportId: string): Promise<VscDailyReport> => {
  const response = await apiClient.get<VscDailyReport>(`/sessions/vsc-daily-reports/${reportId}`);
  return response.data;
};

export const updateVscDailyReport = async (
  reportId: string,
  dto: UpdateVscDailyReportDto,
): Promise<VscDailyReport> => {
  const response = await apiClient.patch<VscDailyReport>(
    `/sessions/vsc-daily-reports/${reportId}`,
    dto,
  );
  return response.data;
};

export const validateVscDailyReport = async (reportId: string): Promise<VscDailyReport> => {
  const response = await apiClient.patch<VscDailyReport>(
    `/sessions/vsc-daily-reports/${reportId}/validate`,
  );
  return response.data;
};

export const deleteVscDailyReport = async (reportId: string): Promise<void> => {
  await apiClient.delete(`/sessions/vsc-daily-reports/${reportId}`);
};

/** True when the report can be shown/edited per product rule (visible_at reached in browser). */
export const isVscDailyReportVisibleNow = (report: VscDailyReport): boolean => {
  return Date.now() >= new Date(report.visibleAt).getTime();
};

/** Format report_date / visibleAt for display in local French locale. */
export const formatVscDailyDate = (isoDate: string): string => {
  const d = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatVscDailyDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
