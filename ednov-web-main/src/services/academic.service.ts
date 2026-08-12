import { XLSX_MIME } from '@/constants/mime-types';
import { apiClient } from './api-client';
import type { Room } from '@/types/room.types';
import type {
  SchoolClass,
  CreateSchoolClassDto,
  UpdateSchoolClassDto,
} from '@/types/school-class.types';
import type {
  SchoolYear,
  CreateSchoolYearDto,
  UpdateSchoolYearDto,
} from '@/types/school-year.types';
import type { Level, CreateLevelDto, UpdateLevelDto } from '@/types/level.types';
import type { Subject, CreateSubjectDto, UpdateSubjectDto } from '@/types/subject.types';
import type { Program, CreateProgramDto, UpdateProgramDto } from '@/types/program.types';
import type {
  Activity,
  ActivityType,
  CreateActivityDto,
  UpdateActivityDto,
  CreateActivityTypeDto,
  UpdateActivityTypeDto,
} from '@/types/activity.types';
import type {
  Holiday,
  CreateHolidayDto,
  UpdateHolidayDto,
  VacationZoneRef,
} from '@/types/holiday.types';
import type { PaginatedResponse } from './users.service';
import { toLocalDateString } from '@/lib/date-utils';

function listUrl(path: string, searchParams: URLSearchParams): string {
  const q = searchParams.toString();
  return q ? `${path}?${q}` : path;
}

export {
  getEstablishments,
  getEstablishment,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment,
} from './establishments.service';

export const getRooms = async (): Promise<Room[]> => {
  const { data } = await apiClient.get('/companies/current/rooms');
  return data;
};

export const getSchoolYears = async (params?: {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  search?: string;
  isCurrent?: boolean;
  periodPhases?: ('ended' | 'upcoming')[];
}): Promise<PaginatedResponse<SchoolYear>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.isCurrent !== undefined)
    searchParams.append('isCurrent', params.isCurrent.toString());
  params?.periodPhases?.forEach((p) => searchParams.append('periodPhases', p));

  const url = listUrl('/academic/school-years', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<SchoolYear>>(url);
  return data;
};

export const getSchoolYear = async (id: string): Promise<SchoolYear> => {
  const { data } = await apiClient.get(`/academic/school-years/${id}`);
  return data;
};

export const createSchoolYear = async (dto: CreateSchoolYearDto): Promise<SchoolYear> => {
  const { data } = await apiClient.post('/academic/school-years', dto);
  return data;
};

export const updateSchoolYear = async (
  id: string,
  dto: UpdateSchoolYearDto,
): Promise<SchoolYear> => {
  const { data } = await apiClient.patch(`/academic/school-years/${id}`, dto);
  return data;
};

export const deleteSchoolYear = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/school-years/${id}`);
};

export const getLevels = async (params?: {
  page?: number;
  pageSize?: number;
  cycles?: string[];
  statuses?: string[];
  search?: string;
  minAge?: number;
  maxAge?: number;
}): Promise<PaginatedResponse<Level>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.cycles?.forEach((c) => searchParams.append('cycles', c));
  params?.statuses?.forEach((s) => searchParams.append('statuses', s));

  if (params?.search) searchParams.append('search', params.search);
  if (params?.minAge !== undefined) searchParams.append('minAge', params.minAge.toString());
  if (params?.maxAge !== undefined) searchParams.append('maxAge', params.maxAge.toString());

  const url = listUrl('/academic/levels', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<Level>>(url);
  return data;
};

export const getLevel = async (id: string): Promise<Level> => {
  const { data } = await apiClient.get(`/academic/levels/${id}`);
  return data;
};

export const createLevel = async (dto: CreateLevelDto): Promise<Level> => {
  const { data } = await apiClient.post('/academic/levels', dto);
  return data;
};

export const updateLevel = async (id: string, dto: UpdateLevelDto): Promise<Level> => {
  const { data } = await apiClient.patch(`/academic/levels/${id}`, dto);
  return data;
};

export const deleteLevel = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/levels/${id}`);
};

export const reorderLevels = async (ids: string[]): Promise<void> => {
  await apiClient.patch('/academic/levels/reorder', { ids });
};

export const getSubjects = async (params?: {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  search?: string;
}): Promise<PaginatedResponse<Subject>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));

  if (params?.search) searchParams.append('search', params.search);

  const url = listUrl('/academic/subjects', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<Subject>>(url);
  return data;
};

export const getSubject = async (id: string): Promise<Subject> => {
  const { data } = await apiClient.get(`/academic/subjects/${id}`);
  return data;
};

export const createSubject = async (dto: CreateSubjectDto): Promise<Subject> => {
  const { data } = await apiClient.post('/academic/subjects', dto);
  return data;
};

export const updateSubject = async (id: string, dto: UpdateSubjectDto): Promise<Subject> => {
  const { data } = await apiClient.patch(`/academic/subjects/${id}`, dto);
  return data;
};

export const deleteSubject = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/subjects/${id}`);
};

export const getPrograms = async (params?: {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  cycles?: string[];
  periodes?: string[];
  isActive?: boolean;
  search?: string;
}): Promise<PaginatedResponse<Program>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  params?.cycles?.forEach((c) => searchParams.append('cycles', c));
  params?.periodes?.forEach((p) => searchParams.append('periodes', p));

  if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
  if (params?.search) searchParams.append('search', params.search);

  const url = listUrl('/academic/programs', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<Program>>(url);
  return data;
};

export const getProgram = async (id: string): Promise<Program> => {
  const { data } = await apiClient.get(`/academic/programs/${id}`);
  return data;
};

export const createProgram = async (dto: CreateProgramDto): Promise<Program> => {
  const { data } = await apiClient.post('/academic/programs', dto);
  return data;
};

export const updateProgram = async (id: string, dto: UpdateProgramDto): Promise<Program> => {
  const { data } = await apiClient.patch(`/academic/programs/${id}`, dto);
  return data;
};

export const deleteProgram = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/programs/${id}`);
};

export const getActivityTypes = async (params?: {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  search?: string;
}): Promise<PaginatedResponse<ActivityType>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  if (params?.search) searchParams.append('search', params.search);

  const url = listUrl('/activity-types', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<ActivityType>>(url);
  return data;
};

export const getActivityType = async (id: string): Promise<ActivityType> => {
  const { data } = await apiClient.get(`/activity-types/${id}`);
  return data;
};

export const createActivityType = async (dto: CreateActivityTypeDto): Promise<ActivityType> => {
  const { data } = await apiClient.post('/activity-types', dto);
  return data;
};

export const updateActivityType = async (
  id: string,
  dto: UpdateActivityTypeDto,
): Promise<ActivityType> => {
  const { data } = await apiClient.patch(`/activity-types/${id}`, dto);
  return data;
};

export const deleteActivityType = async (id: string): Promise<void> => {
  await apiClient.delete(`/activity-types/${id}`);
};

export const getActivities = async (params?: {
  page?: number;
  pageSize?: number;
  statuses?: string[];
  activityTypeIds?: string[];
  hasChat?: boolean;
  hasBot?: boolean;
  hasLink?: boolean;
  canHaveCr?: boolean;
  search?: string;
}): Promise<PaginatedResponse<Activity>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.statuses?.forEach((s) => searchParams.append('statuses', s));
  params?.activityTypeIds?.forEach((id) => searchParams.append('activityTypeIds', id));

  if (params?.hasChat !== undefined) searchParams.append('hasChat', params.hasChat.toString());
  if (params?.hasBot !== undefined) searchParams.append('hasBot', params.hasBot.toString());
  if (params?.hasLink !== undefined) searchParams.append('hasLink', params.hasLink.toString());
  if (params?.canHaveCr !== undefined)
    searchParams.append('canHaveCr', params.canHaveCr.toString());
  if (params?.search) searchParams.append('search', params.search);

  const url = listUrl('/activities', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<Activity>>(url);
  return data;
};

export const getActivity = async (id: string): Promise<Activity> => {
  const { data } = await apiClient.get(`/activities/${id}`);
  return data;
};

export const createActivity = async (dto: CreateActivityDto): Promise<Activity> => {
  const { data } = await apiClient.post('/activities', dto);
  return data;
};

export const updateActivity = async (id: string, dto: UpdateActivityDto): Promise<Activity> => {
  const { data } = await apiClient.patch(`/activities/${id}`, dto);
  return data;
};

export const deleteActivity = async (id: string): Promise<void> => {
  await apiClient.delete(`/activities/${id}`);
};

export const getHolidays = async (params?: {
  page?: number;
  pageSize?: number;
  types?: string[];
  schoolYearId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}): Promise<PaginatedResponse<Holiday>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.types?.forEach((t) => searchParams.append('types', t));
  if (params?.schoolYearId) searchParams.append('schoolYearId', params.schoolYearId);
  if (params?.dateFrom) searchParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) searchParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.search) searchParams.append('search', params.search);

  const url = listUrl('/academic/holidays', searchParams);
  const { data } = await apiClient.get<PaginatedResponse<Holiday>>(url);
  return data;
};

export const getHoliday = async (id: string): Promise<Holiday> => {
  const { data } = await apiClient.get(`/academic/holidays/${id}`);
  return data;
};

export const createHoliday = async (dto: CreateHolidayDto): Promise<Holiday> => {
  const { data } = await apiClient.post('/academic/holidays', dto);
  return data;
};

export const updateHoliday = async (id: string, dto: UpdateHolidayDto): Promise<Holiday> => {
  const { data } = await apiClient.patch(`/academic/holidays/${id}`, dto);
  return data;
};

export const deleteHoliday = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/holidays/${id}`);
};

export const getVacationZones = async (): Promise<VacationZoneRef[]> => {
  const { data } = await apiClient.get<VacationZoneRef[]>('/academic/vacation-zones');
  return data;
};

export const getProfiles = async (): Promise<any[]> => {
  const { data } = await apiClient.get('/profiles');
  return data;
};

function triggerBlobDownload(data: Blob, filename: string): void {
  const blob = new Blob([data], { type: XLSX_MIME });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
}

export const exportSubjectsExcel = async (): Promise<void> => {
  const response = await apiClient.get('/academic/subjects/export', { responseType: 'blob' });
  triggerBlobDownload(response.data, `subjects-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportLevelsExcel = async (): Promise<void> => {
  const response = await apiClient.get('/academic/levels/export', { responseType: 'blob' });
  triggerBlobDownload(response.data, `levels-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportProgramsExcel = async (): Promise<void> => {
  const response = await apiClient.get('/academic/programs/export', { responseType: 'blob' });
  triggerBlobDownload(response.data, `programs-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportSchoolYearsExcel = async (): Promise<void> => {
  const response = await apiClient.get('/academic/school-years/export', { responseType: 'blob' });
  triggerBlobDownload(response.data, `school-years-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportHolidaysExcel = async (): Promise<void> => {
  const response = await apiClient.get('/academic/holidays/export', { responseType: 'blob' });
  triggerBlobDownload(response.data, `holidays-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportActivityTypesExcel = async (): Promise<void> => {
  const response = await apiClient.get('/activity-types/export', { responseType: 'blob' });
  triggerBlobDownload(
    response.data,
    `activity-types-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const exportActivitiesExcel = async (): Promise<void> => {
  const response = await apiClient.get('/activities/export', { responseType: 'blob' });
  triggerBlobDownload(response.data, `activities-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// --- School classes ---

export const getSchoolClasses = async (params?: {
  establishmentId?: string;
  schoolYearId?: string;
  levelId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: SchoolClass[]; total: number; page: number; pageSize: number }> => {
  const searchParams = new URLSearchParams();
  if (params?.establishmentId) searchParams.append('establishmentId', params.establishmentId);
  if (params?.schoolYearId) searchParams.append('schoolYearId', params.schoolYearId);
  if (params?.levelId) searchParams.append('levelId', params.levelId);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
  const url = `/academic/school-classes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const { data } = await apiClient.get(url);
  return data;
};

export const createSchoolClass = async (dto: CreateSchoolClassDto): Promise<SchoolClass> => {
  const { data } = await apiClient.post('/academic/school-classes', dto);
  return data;
};

export const updateSchoolClass = async (
  id: string,
  dto: UpdateSchoolClassDto,
): Promise<SchoolClass> => {
  const { data } = await apiClient.patch(`/academic/school-classes/${id}`, dto);
  return data;
};

export const deleteSchoolClass = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/school-classes/${id}`);
};
