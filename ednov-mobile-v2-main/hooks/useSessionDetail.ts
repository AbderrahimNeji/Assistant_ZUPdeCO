import { useQuery } from '@tanstack/react-query';

import { fetchSessionById } from '@/services/sessions';

export function useSessionDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSessionById(id!),
    enabled: !!id,
    placeholderData: (previousData) => previousData,
  });
}
