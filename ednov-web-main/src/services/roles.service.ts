import { apiClient } from './api-client';
import type {
  Role,
  RoleGroup,
  RoleBinding,
  CreateRolePayload,
  UpdateRolePayload,
  CreateRoleGroupPayload,
  UpdateRoleGroupPayload,
} from '@/types/role.types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export const getRoles = async (params?: {
  page?: number;
  pageSize?: number;
  roleGroups?: string[];
  statuses?: string[];
  modes?: string[];
  search?: string;
  minHierarchyLevel?: number;
  maxHierarchyLevel?: number;
  roleGroup?: string;
}): Promise<PaginatedResponse<Role>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params?.roleGroups?.length) searchParams.set('roleGroups', params.roleGroups.join(','));
  if (params?.statuses?.length) searchParams.set('statuses', params.statuses.join(','));
  if (params?.modes?.length) searchParams.set('modes', params.modes.join(','));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.minHierarchyLevel !== undefined)
    searchParams.set('minHierarchyLevel', params.minHierarchyLevel.toString());
  if (params?.maxHierarchyLevel !== undefined)
    searchParams.set('maxHierarchyLevel', params.maxHierarchyLevel.toString());
  if (params?.roleGroup) searchParams.set('roleGroup', params.roleGroup);

  const { data } = await apiClient.get<PaginatedResponse<Role>>(
    `/roles?${searchParams.toString()}`,
  );
  return data;
};

export const getRole = async (id: string): Promise<Role> => {
  const { data } = await apiClient.get<Role>(`/roles/${id}`);
  return data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const { data } = await apiClient.get<{
    data: Role[];
    total: number;
    page: number;
    pageSize: number;
  }>('/roles');
  return data.data; // Unwrap the data array from paginated response
};

export const fetchRole = async (id: string): Promise<Role> => {
  const { data } = await apiClient.get<Role>(`/roles/${id}`);
  return data;
};

export const createRole = async (payload: CreateRolePayload): Promise<Role> => {
  const { data } = await apiClient.post<Role>('/roles', payload);
  return data;
};

export const updateRole = async (id: string, payload: UpdateRolePayload): Promise<Role> => {
  const { data } = await apiClient.patch<Role>(`/roles/${id}`, payload);
  return data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiClient.delete(`/roles/${id}`);
};

// ─── Role Groups ─────────────────────────────────────────────────────────────

export const fetchRoleGroups = async (): Promise<RoleGroup[]> => {
  const { data } = await apiClient.get<RoleGroup[]>('/roles/groups');
  return data;
};

export const createRoleGroup = async (payload: CreateRoleGroupPayload): Promise<RoleGroup> => {
  const { data } = await apiClient.post<RoleGroup>('/roles/groups', payload);
  return data;
};

export const updateRoleGroup = async (
  id: string,
  payload: UpdateRoleGroupPayload,
): Promise<RoleGroup> => {
  const { data } = await apiClient.patch<RoleGroup>(`/roles/groups/${id}`, payload);
  return data;
};

export const deleteRoleGroup = async (id: string): Promise<void> => {
  await apiClient.delete(`/roles/groups/${id}`);
};

// ─── Export ──────────────────────────────────────────────────────────────────

const triggerBlobDownload = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportRolesExcel = async (): Promise<void> => {
  const { data } = await apiClient.get('/roles/export/excel', {
    responseType: 'blob',
  });
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const timestamp = new Date().toISOString().split('T')[0];
  triggerBlobDownload(blob, `roles-${timestamp}.xlsx`);
};

// ─── Role Interface Bindings ─────────────────────────────────────────────────

export const fetchRoleInterfaceBindings = async (roleId: string): Promise<RoleBinding[]> => {
  const { data } = await apiClient.get<RoleBinding[]>(`/roles/${roleId}/interface-elements`);
  return data;
};

export const replaceRoleInterfaceBindings = async (
  roleId: string,
  bindings: RoleBinding[],
): Promise<void> => {
  await apiClient.put(`/roles/${roleId}/interface-elements`, { bindings });
};
