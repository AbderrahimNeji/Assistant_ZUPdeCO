import { XLSX_MIME } from '@/constants/mime-types';
import apiClient from './api-client';
import type { UserAccountStatus, UserWithProfile } from '@/types/user.types';
import { toLocalDateString } from '@/lib/date-utils';

export interface User {
  id: string;
  companyId: string;
  firebaseUid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: UserAccountStatus;
}

export interface Role {
  id: string;
  companyId: string;
  code: string;
  label: string;
  description: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const getRoles = async (): Promise<Role[]> => {
  const { data } = await apiClient.get<Role[] | PaginatedResponse<Role>>('/roles');
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

/**
 * Regenerate and re-send the activation email (14-day link) for a pending (non-activated) user.
 */
export const regenerateInvitation = async (userId: string): Promise<{ sent: boolean }> => {
  const { data } = await apiClient.post(
    `/users/${encodeURIComponent(userId)}/regenerate-invitation`,
  );
  return data;
};

interface GetUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  excludeIds?: string[];
  statuses?: string[];
  establishmentId?: string;
  subjectIds?: string[];
  /** 0=Sunday .. 6=Saturday (OR: tutor has a slot on any selected day) */
  availabilityDays?: number[];
  /** VSC report frequency filter (OR within group) */
  vscFrequencies?: ('daily' | 'weekly')[];
  levelIds?: string[];
  classIds?: string[];
  specialtyIds?: string[];
  roleCodes?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  managedById?: string;
  isMinor?: boolean;
  hasSpecialNeeds?: boolean;
  exitDateFrom?: Date;
  exitDateTo?: Date;
  exitReason?: string;
  /** Engagement start date range (ISO string) — for tutors/volunteers */
  engagementStartDateFrom?: string;
  engagementStartDateTo?: string;
  /** Exit date range (ISO string) — for tutors/volunteers */
  tutorExitDateFrom?: string;
  tutorExitDateTo?: string;
  tutorExitReason?: string;
}

// Tutors
export const getTutors = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.subjectIds?.forEach((id) => queryParams.append('subjectIds', id));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  params?.availabilityDays?.forEach((d) => queryParams.append('availabilityDays', String(d)));
  if (params?.engagementStartDateFrom)
    queryParams.append('engagementStartDateFrom', params.engagementStartDateFrom);
  if (params?.engagementStartDateTo)
    queryParams.append('engagementStartDateTo', params.engagementStartDateTo);
  if (params?.tutorExitDateFrom) queryParams.append('tutorExitDateFrom', params.tutorExitDateFrom);
  if (params?.tutorExitDateTo) queryParams.append('tutorExitDateTo', params.tutorExitDateTo);
  if (params?.tutorExitReason) queryParams.append('tutorExitReason', params.tutorExitReason);

  const { data } = await apiClient.get(`/users/tutors?${queryParams.toString()}`);
  return data;
};

export const getTutor = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/tutors/${encodeURIComponent(identifier)}`);
  return data;
};

// Students
export const getStudents = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.levelIds?.forEach((id) => queryParams.append('levelIds', id));
  params?.subjectIds?.forEach((id) => queryParams.append('subjectIds', id));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.isMinor !== undefined) queryParams.append('isMinor', params.isMinor.toString());
  if (params?.hasSpecialNeeds !== undefined)
    queryParams.append('hasSpecialNeeds', params.hasSpecialNeeds.toString());
  params?.classIds?.forEach((id) => queryParams.append('classIds', id));
  params?.specialtyIds?.forEach((id) => queryParams.append('specialtyIds', id));
  if (params?.exitDateFrom)
    queryParams.append('exitDateFrom', toLocalDateString(params.exitDateFrom));
  if (params?.exitDateTo) queryParams.append('exitDateTo', toLocalDateString(params.exitDateTo));
  if (params?.exitReason) queryParams.append('exitReason', params.exitReason);

  const { data } = await apiClient.get(`/users/students?${queryParams.toString()}`);
  return data;
};

export const getStudent = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/students/${encodeURIComponent(identifier)}`);
  return data;
};

/** Réponse `GET /users/:id/status-history` (récent en premier). */
export interface StudentStatusHistoryRow {
  id: string;
  studentUserId: string;
  oldStatus: string | null;
  newStatus: string;
  createdAt: string;
}

export const getStudentStatusHistory = async (
  userId: string,
): Promise<StudentStatusHistoryRow[]> => {
  const { data } = await apiClient.get<StudentStatusHistoryRow[]>(
    `/users/${encodeURIComponent(userId)}/status-history`,
  );
  return data;
};

// Volunteers
export const getVolunteers = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.levelIds?.forEach((id) => queryParams.append('levelIds', id));
  params?.subjectIds?.forEach((id) => queryParams.append('subjectIds', id));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  params?.availabilityDays?.forEach((d) => queryParams.append('availabilityDays', String(d)));
  params?.vscFrequencies?.forEach((f) => queryParams.append('vscFrequencies', f));
  if (params?.engagementStartDateFrom)
    queryParams.append('engagementStartDateFrom', params.engagementStartDateFrom);
  if (params?.engagementStartDateTo)
    queryParams.append('engagementStartDateTo', params.engagementStartDateTo);
  if (params?.tutorExitDateFrom) queryParams.append('tutorExitDateFrom', params.tutorExitDateFrom);
  if (params?.tutorExitDateTo) queryParams.append('tutorExitDateTo', params.tutorExitDateTo);
  if (params?.tutorExitReason) queryParams.append('tutorExitReason', params.tutorExitReason);

  const { data } = await apiClient.get(`/users/volunteers?${queryParams.toString()}`);
  return data;
};

export const getVolunteer = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/volunteers/${encodeURIComponent(identifier)}`);
  return data;
};

// Admins (admin, manager, coordinator combined)
export const getAdmins = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));

  const { data } = await apiClient.get(`/users/admins?${queryParams.toString()}`);
  return data;
};

export const getAdmin = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/admins/${encodeURIComponent(identifier)}`);
  return data;
};

// Managers
export const getManagers = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  const { data } = await apiClient.get(`/users/managers?${queryParams.toString()}`);
  return data;
};

export const getManager = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/managers/${encodeURIComponent(identifier)}`);
  return data;
};

// Coordinators
export const getCoordinators = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));
  if (params?.managedById) queryParams.append('managedById', params.managedById);

  const { data } = await apiClient.get(`/users/coordinators?${queryParams.toString()}`);
  return data;
};

export const getCoordinator = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/coordinators/${encodeURIComponent(identifier)}`);
  return data;
};

// Superadmins
export const getSuperadmins = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  const { data } = await apiClient.get(`/users/superadmins?${queryParams.toString()}`);
  return data;
};

export const getSuperadmin = async (identifier: string): Promise<UserWithProfile> => {
  const { data } = await apiClient.get(`/users/superadmins/${encodeURIComponent(identifier)}`);
  return data;
};

// Users for sharing (volunteer, coordinator, manager roles)
export const getUsersForSharing = async (
  params?: GetUsersParams,
): Promise<PaginatedResponse<UserWithProfile>> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  const { data } = await apiClient.get(`/users/for-sharing?${queryParams.toString()}`);
  return data;
};

// Get all users (for ShareModal and other components that need full user list)
export const getAllUsers = async (): Promise<UserWithProfile[]> => {
  const { data } = await apiClient.get('/users?pageSize=5');
  return data.data || [];
};

/** Export students as Excel (.xlsx). */
export const exportStudentsExcel = async (params?: GetUsersParams): Promise<void> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.levelIds?.forEach((id) => queryParams.append('levelIds', id));
  params?.subjectIds?.forEach((id) => queryParams.append('subjectIds', id));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.isMinor !== undefined) queryParams.append('isMinor', params.isMinor.toString());
  if (params?.hasSpecialNeeds !== undefined)
    queryParams.append('hasSpecialNeeds', params.hasSpecialNeeds.toString());
  if (params?.exitDateFrom)
    queryParams.append('exitDateFrom', toLocalDateString(params.exitDateFrom));
  if (params?.exitDateTo) queryParams.append('exitDateTo', toLocalDateString(params.exitDateTo));
  if (params?.exitReason) queryParams.append('exitReason', params.exitReason);

  const response = await apiClient.get(`/users/students/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `students-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

/** Export tutors as Excel (.xlsx) (same query param pattern as exportStudentsExcel). */
export const exportTutorsExcel = async (params?: GetUsersParams): Promise<void> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.levelIds?.forEach((id) => queryParams.append('levelIds', id));
  params?.subjectIds?.forEach((id) => queryParams.append('subjectIds', id));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  params?.availabilityDays?.forEach((d) => queryParams.append('availabilityDays', String(d)));

  const response = await apiClient.get(`/users/tutors/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tutors-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

/** Export volunteers (VSC) as Excel (.xlsx) (same query param pattern as exportTutorsExcel). */
export const exportVolunteersExcel = async (params?: GetUsersParams): Promise<void> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.excludeIds?.length) queryParams.append('excludeIds', params.excludeIds.join(','));

  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.levelIds?.forEach((id) => queryParams.append('levelIds', id));
  params?.subjectIds?.forEach((id) => queryParams.append('subjectIds', id));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));

  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  params?.availabilityDays?.forEach((d) => queryParams.append('availabilityDays', String(d)));
  params?.vscFrequencies?.forEach((f) => queryParams.append('vscFrequencies', f));

  const response = await apiClient.get(`/users/volunteers/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `volunteers-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

/** Export admins (admin, manager, coordinator) as Excel (.xlsx). */
export const exportAdminsExcel = async (
  params?: Pick<GetUsersParams, 'search' | 'statuses' | 'roleCodes' | 'dateFrom' | 'dateTo'>,
): Promise<void> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  params?.statuses?.forEach((s) => queryParams.append('statuses', s));
  params?.roleCodes?.forEach((code) => queryParams.append('roleCodes', code));
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));

  const response = await apiClient.get(`/users/admins/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `admins-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};
