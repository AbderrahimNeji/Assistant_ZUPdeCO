import { apiClient } from './api-client';
import type { Admin, CreateAdminDto, UpdateAdminDto } from '@/types/admin.types';

export const createAdmin = async (dto: CreateAdminDto): Promise<Admin> => {
  const response = await apiClient.post('/users/invite', dto);
  return response.data.user;
};

export const updateAdmin = async (id: string, dto: UpdateAdminDto): Promise<Admin> => {
  const response = await apiClient.patch(`/users/${id}`, dto);
  return response.data;
};

export const deleteAdmin = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
