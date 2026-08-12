import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchAttendanceHistory, type AttendanceHistoryQuery } from '@/services/sessions';
import { useAuth } from '@/providers/AuthProvider';

const PAGE_SIZE = 20;

export function useAttendanceHistory(query?: AttendanceHistoryQuery) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['attendance-history', query?.dateFrom, query?.dateTo, query?.page, query?.pageSize],
    queryFn: () => fetchAttendanceHistory(query),
    enabled: !!user,
    placeholderData: (previousData) => previousData,
  });
}

export function useAttendanceHistoryInfinite(query?: Omit<AttendanceHistoryQuery, 'page' | 'pageSize'>) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['attendance-history', 'infinite', query?.dateFrom, query?.dateTo],
    queryFn: ({ pageParam }) =>
      fetchAttendanceHistory({ ...query, page: pageParam as number, pageSize: PAGE_SIZE }),
    enabled: !!user,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * PAGE_SIZE < lastPage.total ? lastPage.page + 1 : undefined,
  });
}
