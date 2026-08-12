import { apiClient } from './api-client';
import type { Volunteer, CreateVolunteerDto, UpdateVolunteerDto } from '@/types/volunteer.types';

export const createVolunteer = async (dto: CreateVolunteerDto): Promise<Volunteer> => {
  const response = await apiClient.post('/users/invite', dto);
  return response.data.user;
};

export const updateVolunteer = async (id: string, dto: UpdateVolunteerDto): Promise<Volunteer> => {
  const response = await apiClient.patch(`/users/${id}`, dto);
  return response.data;
};

export const deleteVolunteer = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};

export const updateVscReportsFrequencies = async (
  userId: string,
  frequencies: { daily: boolean; weekly: boolean },
): Promise<void> => {
  await apiClient.patch(`/users/${userId}/vsc-reports-frequencies`, {
    vscReportsFrequencies: frequencies,
  });
};

export const getVscReportsFrequencies = async (
  userId: string,
): Promise<{ daily: boolean; weekly: boolean }> => {
  const response = await apiClient.get(`/users/${userId}/vsc-reports-frequencies`);
  return response.data;
};
