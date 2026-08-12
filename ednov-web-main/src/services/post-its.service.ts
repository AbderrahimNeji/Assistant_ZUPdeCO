import apiClient from './api-client';
import {
  PostIt,
  CreatePostItDto,
  UpdatePostItDto,
  PostItStatus,
  AssignedPostIt,
  CreateAssignedPostItDto,
  BulkAssignedPostItDto,
  BulkAssignedPostItResult,
  AssignedRecurrence,
  TrackingOccurrence,
  TrackingUsersResponse,
} from '@/types/post-it.types';

export interface PostItFilters {
  archived?: boolean;
  priority?: boolean;
  thematic?: string;
  status?: PostItStatus;
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PostItListResponse {
  postIts: PostIt[];
  total: number;
  page: number;
  limit: number;
}

export const getPostIts = async (filters?: PostItFilters): Promise<PostItListResponse> => {
  const params = new URLSearchParams();

  if (filters?.archived !== undefined) {
    params.append('archived', filters.archived.toString());
  }
  if (filters?.priority !== undefined) {
    params.append('priority', filters.priority.toString());
  }
  if (filters?.thematic) {
    params.append('thematic', filters.thematic);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  if (filters?.page) {
    params.append('page', filters.page.toString());
  }
  if (filters?.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters?.dateFrom) {
    params.append('dateFrom', filters.dateFrom);
  }
  if (filters?.dateTo) {
    params.append('dateTo', filters.dateTo);
  }

  const response = await apiClient.get<PostItListResponse>(`/post-its?${params.toString()}`);
  return response.data;
};

export const getPostIt = async (id: string): Promise<PostIt> => {
  const response = await apiClient.get<PostIt>(`/post-its/${id}`);
  return response.data;
};

export const createPostIt = async (data: CreatePostItDto): Promise<PostIt> => {
  const response = await apiClient.post<PostIt>('/post-its', data);
  return response.data;
};

export const updatePostIt = async (id: string, data: UpdatePostItDto): Promise<PostIt> => {
  const response = await apiClient.patch<PostIt>(`/post-its/${id}`, data);
  return response.data;
};

export const deletePostIt = async (id: string): Promise<void> => {
  await apiClient.delete(`/post-its/${id}`);
};

export const toggleArchive = async (id: string): Promise<PostIt> => {
  const response = await apiClient.patch<PostIt>(`/post-its/${id}/archive`);
  return response.data;
};

export const togglePriority = async (id: string): Promise<PostIt> => {
  const response = await apiClient.patch<PostIt>(`/post-its/${id}/priority`);
  return response.data;
};

export const updateStatus = async (id: string, status: PostItStatus): Promise<PostIt> => {
  const response = await apiClient.patch<PostIt>(`/post-its/${id}/status`, { status });
  return response.data;
};

export const sharePostIt = async (
  id: string,
  userIds: string[],
  permission: 'read' | 'write',
): Promise<{ message: string; sharesCount: number }> => {
  const response = await apiClient.post(`/post-its/${id}/share`, { userIds, permission });
  return response.data;
};

export const sharePostItByRole = async (
  id: string,
  roleCode: string,
  permission: 'read' | 'write',
): Promise<{ message: string; sharesCount: number }> => {
  const response = await apiClient.post(`/post-its/${id}/share/role`, { roleCode, permission });
  return response.data;
};

export const removeShare = async (id: string, userId: string): Promise<void> => {
  await apiClient.delete(`/post-its/${id}/share/${userId}`);
};

export const getShares = async (id: string) => {
  const response = await apiClient.get(`/post-its/${id}/shares`);
  return response.data;
};

// POC-317: Hard delete pour post-its archivés
export const hardDeletePostIt = async (id: string): Promise<void> => {
  await apiClient.delete(`/post-its/${id}/hard`);
};

export const emptyTrash = async (): Promise<{ count: number }> => {
  const response = await apiClient.delete<{ count: number }>('/post-its/trash/empty');
  return response.data;
};

// ─── Assigned post-its (templates) ───────────────────────────────────────────

export interface AssignedPostItFilters {
  filter?: AssignedRecurrence | 'all';
  dateFrom?: string;
  dateTo?: string;
  quarterlyPeriods?: number[];
}

export const getAssignedPostIts = async (
  filters?: AssignedPostItFilters,
): Promise<AssignedPostIt[]> => {
  const params = new URLSearchParams();
  if (filters?.filter && filters.filter !== 'all') params.append('filter', filters.filter);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  filters?.quarterlyPeriods?.forEach((p) => params.append('quarterlyPeriods', String(p)));
  const qs = params.toString();
  const url = qs ? `/post-its/assigned?${qs}` : '/post-its/assigned';
  const response = await apiClient.get<AssignedPostIt[]>(url);
  return response.data;
};

export const createAssignedPostIt = async (
  data: CreateAssignedPostItDto,
): Promise<AssignedPostIt> => {
  const response = await apiClient.post<AssignedPostIt>('/post-its/assigned', data);
  return response.data;
};

export const updateAssignedPostIt = async (
  id: string,
  data: Partial<CreateAssignedPostItDto>,
): Promise<AssignedPostIt> => {
  const response = await apiClient.patch<AssignedPostIt>(`/post-its/assigned/${id}`, data);
  return response.data;
};

export const deleteAssignedPostIt = async (id: string): Promise<void> => {
  await apiClient.delete(`/post-its/assigned-templates/${id}`);
};

export const bulkUpdateAssignedPostIts = async (
  data: BulkAssignedPostItDto,
): Promise<BulkAssignedPostItResult> => {
  const response = await apiClient.post<BulkAssignedPostItResult>('/post-its/assigned/bulk', data);
  return response.data;
};

export const bulkDeleteAssignedTemplates = async (ids: string[]): Promise<{ deleted: number }> => {
  const response = await apiClient.delete<{ deleted: number }>(
    '/post-its/assigned-templates/bulk',
    {
      data: { ids },
    },
  );
  return response.data;
};

export const bulkUpdateAssignedTemplates = async (data: {
  ids: string[];
  data: { isPriority?: boolean };
}): Promise<{ updated: number }> => {
  const response = await apiClient.patch<{ updated: number }>(
    '/post-its/assigned-templates/bulk',
    data,
  );
  return response.data;
};

export const getNextOccurrences = async (
  id: string,
  count: number = 12,
): Promise<Array<{ key: string; label: string; date: string }>> => {
  const response = await apiClient.get<Array<{ key: string; label: string; date: string }>>(
    `/post-its/assigned-templates/${id}/next-occurrences?count=${count}`,
  );
  return response.data;
};

export const getTrackingOccurrences = async (templateId: string): Promise<TrackingOccurrence[]> => {
  const response = await apiClient.get<TrackingOccurrence[]>(
    `/post-its/assigned-templates/${templateId}/tracking/occurrences`,
  );
  return response.data;
};

export const getTrackingUsers = async (
  templateId: string,
  params: {
    periodKey: string;
    status?: PostItStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<TrackingUsersResponse> => {
  const queryParams = new URLSearchParams();
  queryParams.append('periodKey', params.periodKey);
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

  const url = `/post-its/assigned-templates/${templateId}/tracking/users?${queryParams.toString()}`;
  const response = await apiClient.get<TrackingUsersResponse>(url);
  return response.data;
};

export const forceCompleteForUser = async (
  templateId: string,
  userId: string,
  periodKey: string,
): Promise<void> => {
  await apiClient.patch(`/post-its/assigned-templates/${templateId}/tracking/force-complete`, {
    userId,
    periodKey,
  });
};
