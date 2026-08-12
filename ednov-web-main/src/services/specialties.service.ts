import { apiClient } from './api-client';
import type { PaginatedResponse } from './users.service';
import type { Level } from '@/types/level.types';

export interface LevelRef {
  id: string;
  code: string;
  label: string;
}

export interface Specialty {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  levelLinks?: Array<{ level: LevelRef }>;
}

export interface CreateSpecialtyDto {
  code: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
  levelIds?: string[];
}

export interface UpdateSpecialtyDto {
  code?: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  levelIds?: string[];
}

export const getSpecialties = async (activeOnly = true): Promise<Specialty[]> => {
  const { data } = await apiClient.get<Specialty[] | PaginatedResponse<Specialty>>('/specialties', {
    params: { activeOnly },
  });
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

export const getSpecialty = async (id: string): Promise<Specialty> => {
  const response = await apiClient.get<Specialty>(`/specialties/${id}`);
  return response.data;
};

export const createSpecialty = async (dto: CreateSpecialtyDto): Promise<Specialty> => {
  const response = await apiClient.post<Specialty>('/specialties', dto);
  return response.data;
};

export const updateSpecialty = async (id: string, dto: UpdateSpecialtyDto): Promise<Specialty> => {
  const response = await apiClient.patch<Specialty>(`/specialties/${id}`, dto);
  return response.data;
};

export const deleteSpecialty = async (id: string): Promise<void> => {
  await apiClient.delete(`/specialties/${id}`);
};

export const getHighSchoolLevels = async (): Promise<Level[]> => {
  const response = await apiClient.get<Level[]>('/specialties/levels/high');
  return response.data;
};

export const reorderSpecialties = async (ids: string[]): Promise<void> => {
  await apiClient.patch('/specialties/reorder', { ids });
};
