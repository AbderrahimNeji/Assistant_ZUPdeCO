import apiClient from './api-client';
import { InterfaceElement } from '@/types/interface-elements.types';

export const getInterfaceElements = async (interfaceName: string): Promise<InterfaceElement[]> => {
  const { data } = await apiClient.get(`/interface-elements/${interfaceName}`);
  return data;
};

export const getAllInterfaceElements = async (): Promise<Record<string, InterfaceElement[]>> => {
  const { data } = await apiClient.get('/interface-elements');
  return data;
};

export const getAllInterfaceElementsForBuilder = async (): Promise<
  Record<string, InterfaceElement[]>
> => {
  const { data } = await apiClient.get('/interface-elements/all-for-builder');
  return data;
};
