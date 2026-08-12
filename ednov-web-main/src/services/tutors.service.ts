import { apiClient } from './api-client';
import type { Tutor, CreateTutorDto, UpdateTutorDto } from '@/types/tutor.types';

export const createTutor = async (dto: CreateTutorDto): Promise<Tutor> => {
  const response = await apiClient.post('/users/invite', dto);
  return response.data.user;
};

export const updateTutor = async (id: string, dto: UpdateTutorDto): Promise<Tutor> => {
  const response = await apiClient.patch(`/users/${id}`, dto);
  return response.data;
};

export const deleteTutor = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
