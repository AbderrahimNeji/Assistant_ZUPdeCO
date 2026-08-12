import { env } from '@/config/env';
import api from '@/services/api';
import type { PedagogicalResource, ResourcesListQuery, ResourcesListResponse } from '@/types/resources';
import { getStaticResourcesList, getStaticResourceById } from '@/data/staticData';

export async function fetchResources(query?: ResourcesListQuery): Promise<ResourcesListResponse> {
  if (env.useStaticData) return getStaticResourcesList(query);
  if (env.apiUrl) {
    const { data } = await api.get<ResourcesListResponse>('/resources', { params: query });
    return data;
  }
  return getStaticResourcesList(query);
}

export async function fetchResourceById(id: string): Promise<PedagogicalResource | null> {
  if (env.useStaticData) return getStaticResourceById(id);
  if (env.apiUrl) {
    try {
      const { data } = await api.get<PedagogicalResource>(`/resources/${id}`);
      return data;
    } catch {
      return null;
    }
  }
  return getStaticResourceById(id);
}
