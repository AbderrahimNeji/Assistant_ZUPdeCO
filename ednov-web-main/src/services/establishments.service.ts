import { XLSX_MIME } from '@/constants/mime-types';
import { apiClient } from './api-client';
import type {
  Establishment,
  CreateEstablishmentDto,
  UpdateEstablishmentDto,
} from '@/types/establishment.types';

export interface EstablishmentsResponse {
  data: Establishment[];
  total: number;
  page: number;
  pageSize: number;
}

export const getEstablishments = async (params?: {
  page?: number;
  pageSize?: number;
  types?: string[];
  categories?: string[];
  priorityNetworks?: string[];
  isQpv?: boolean;
  statuses?: string[];
  cities?: string[];
  departments?: string[];
  search?: string;
  coordinatorId?: string;
  managedById?: string;
  specialtyIds?: string[];
}): Promise<EstablishmentsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.types && params.types.length > 0) {
    params.types.forEach((type) => queryParams.append('types', type));
  }
  if (params?.categories && params.categories.length > 0) {
    params.categories.forEach((cat) => queryParams.append('categories', cat));
  }
  if (params?.priorityNetworks && params.priorityNetworks.length > 0) {
    params.priorityNetworks.forEach((n) => queryParams.append('priorityNetworks', n));
  }
  if (params?.isQpv !== undefined) queryParams.append('isQpv', params.isQpv.toString());
  if (params?.statuses && params.statuses.length > 0) {
    params.statuses.forEach((status) => queryParams.append('statuses', status));
  }
  if (params?.cities && params.cities.length > 0) {
    params.cities.forEach((city) => queryParams.append('cities', city));
  }
  if (params?.departments && params.departments.length > 0) {
    params.departments.forEach((dept) => queryParams.append('departments', dept));
  }
  if (params?.search) queryParams.append('search', params.search);
  if (params?.coordinatorId) queryParams.append('coordinatorId', params.coordinatorId);
  if (params?.managedById) queryParams.append('managedById', params.managedById);
  if (params?.specialtyIds && params.specialtyIds.length > 0) {
    params.specialtyIds.forEach((id) => queryParams.append('specialtyIds', id));
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `/companies/current/establishments?${queryString}`
    : '/companies/current/establishments';

  const { data } = await apiClient.get(url);
  return data;
};

export const getEstablishment = async (id: string): Promise<Establishment> => {
  const { data } = await apiClient.get(`/companies/current/establishments/${id}`);
  return data;
};

export const createEstablishment = async (dto: CreateEstablishmentDto): Promise<Establishment> => {
  const { data } = await apiClient.post('/companies/current/establishments', dto);
  return data;
};

export const updateEstablishment = async (
  id: string,
  dto: UpdateEstablishmentDto,
): Promise<Establishment> => {
  const { data } = await apiClient.patch(`/companies/current/establishments/${id}`, dto);
  return data;
};

export const deleteEstablishment = async (id: string): Promise<void> => {
  await apiClient.delete(`/companies/current/establishments/${id}`);
};

export const searchEstablishments = async (
  query: string,
  page: number = 1,
  limit: number = 5,
  department?: string,
): Promise<{ data: Establishment[]; total: number; hasMore: boolean }> => {
  const { data } = await apiClient.get('/companies/current/establishments/search', {
    params: { query, page, limit, ...(department ? { department } : {}) },
  });
  return data;
};

/** Large exports (60k+ rows) can exceed default API client timeout. */
const EXPORT_EXCEL_TIMEOUT_MS = 600_000;

/** Export establishments as Excel (.xlsx). */
export const exportEstablishmentsExcel = async (params?: {
  types?: string[];
  categories?: string[];
  priorityNetworks?: string[];
  isQpv?: boolean;
  statuses?: string[];
  cities?: string[];
  departments?: string[];
  search?: string;
  coordinatorId?: string;
  managedById?: string;
}): Promise<void> => {
  const queryParams = new URLSearchParams();
  queryParams.append('exportExcel', 'true');
  params?.types?.forEach((t) => queryParams.append('types', t));
  params?.categories?.forEach((c) => queryParams.append('categories', c));
  params?.priorityNetworks?.forEach((n) => queryParams.append('priorityNetworks', n));
  if (params?.isQpv !== undefined) queryParams.append('isQpv', params.isQpv.toString());
  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.cities?.forEach((c) => queryParams.append('cities', c));
  params?.departments?.forEach((d) => queryParams.append('departments', d));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.coordinatorId) queryParams.append('coordinatorId', params.coordinatorId);
  if (params?.managedById) queryParams.append('managedById', params.managedById);

  const response = await apiClient.get(
    `/companies/current/establishments?${queryParams.toString()}`,
    { responseType: 'blob', timeout: EXPORT_EXCEL_TIMEOUT_MS },
  );

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `establishments-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};
