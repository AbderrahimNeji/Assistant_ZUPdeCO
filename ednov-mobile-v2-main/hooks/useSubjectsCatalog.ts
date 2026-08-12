import { useQuery } from '@tanstack/react-query';

import { fetchSubjectsCatalog } from '@/services/subjects';
import { useAuth } from '@/providers/AuthProvider';

export function useSubjectsCatalog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subjects', 'catalog'],
    queryFn: fetchSubjectsCatalog,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
