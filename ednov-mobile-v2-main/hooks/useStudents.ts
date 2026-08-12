import { useQuery } from '@tanstack/react-query';

import { fetchStudentsWithMeta } from '@/services/students';
import { useAuth } from '@/providers/AuthProvider';
import { useCompanyStore } from '@/store/companyStore';

export function useStudents() {
  const { user } = useAuth();
  const roleKey = useCompanyStore((s) => s.roleCodes.join('|'));
  return useQuery({
    queryKey: ['students', roleKey],
    queryFn: fetchStudentsWithMeta,
    enabled: !!user,
    placeholderData: (previousData) => previousData,
  });
}
