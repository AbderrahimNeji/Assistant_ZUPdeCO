import { apiClient } from './api-client';

export interface ContactFunction {
  id: string;
  companyId: string;
  label: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactFunctionDto {
  label: string;
}

export interface UpdateContactFunctionDto {
  label?: string;
  isDefault?: boolean;
}

export const getContactFunctions = async (): Promise<ContactFunction[]> => {
  const { data } = await apiClient.get('/contact-functions');
  return data;
};

export const getContactFunction = async (id: string): Promise<ContactFunction> => {
  const { data } = await apiClient.get(`/contact-functions/${id}`);
  return data;
};

export const createContactFunction = async (
  dto: CreateContactFunctionDto,
): Promise<ContactFunction> => {
  const { data } = await apiClient.post('/contact-functions', dto);
  return data;
};

export const updateContactFunction = async (
  id: string,
  dto: UpdateContactFunctionDto,
): Promise<ContactFunction> => {
  const { data } = await apiClient.put(`/contact-functions/${id}`, dto);
  return data;
};

export const deleteContactFunction = async (id: string): Promise<void> => {
  await apiClient.delete(`/contact-functions/${id}`);
};
