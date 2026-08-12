import { apiClient } from './api-client';
import { GlobalSearchResponse } from '@/types/search.types';

export const searchService = {
  globalSearch: async (query: string, page = 1, pageSize = 5): Promise<GlobalSearchResponse> => {
    const response = await apiClient.get('/search/global', {
      params: { q: query, page, pageSize },
    });
    return response.data;
  },
};
