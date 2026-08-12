import { apiClient } from './api-client';
import type { Room, CreateRoomDto, UpdateRoomDto } from '@/types/room.types';

export const getRooms = async (establishmentId: string): Promise<Room[]> => {
  const { data } = await apiClient.get(
    `/companies/current/rooms?establishmentId=${establishmentId}`,
  );
  return data;
};

export const getRoom = async (roomId: string): Promise<Room> => {
  const { data } = await apiClient.get(`/companies/current/rooms/${roomId}`);
  return data;
};

export const createRoom = async (dto: CreateRoomDto): Promise<Room> => {
  const { data } = await apiClient.post('/companies/current/rooms', dto);
  return data;
};

export const updateRoom = async (roomId: string, dto: UpdateRoomDto): Promise<Room> => {
  const { data } = await apiClient.patch(`/companies/current/rooms/${roomId}`, dto);
  return data;
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await apiClient.delete(`/companies/current/rooms/${roomId}`);
};
