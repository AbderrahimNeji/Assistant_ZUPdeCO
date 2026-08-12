import apiClient from './api-client';
import { CompleteBrandingResponse } from '@/types/branding.types';

export const getBranding = async (): Promise<CompleteBrandingResponse> => {
  const { data } = await apiClient.get('/branding/complete');
  return data;
};
