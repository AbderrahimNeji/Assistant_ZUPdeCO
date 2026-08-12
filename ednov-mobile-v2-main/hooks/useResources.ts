import { useQuery } from '@tanstack/react-query';
import { fetchResources, fetchResourceById } from '@/services/resources';
import { useAuth } from '@/providers/AuthProvider';
import type { ResourcesListQuery } from '@/types/resources';

export function useResources(query?: ResourcesListQuery) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resources', query],
    queryFn: () => fetchResources(query),
    enabled: !!user,
  });
}

export function useResource(id: string | null) {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: () => (id ? fetchResourceById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}
