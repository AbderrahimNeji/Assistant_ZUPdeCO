import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { fetchAssignmentCandidates } from '@/services/sessions';
import type { AssignmentCandidate } from '@/types/session';

export function useAssignmentCandidates(sessionId: string | undefined): {
  students: AssignmentCandidate[];
  tutors: AssignmentCandidate[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  isEnabled: boolean;
} {
  const showAssignmentCandidates = env.showAssignmentCandidates;
  const enabled =
    showAssignmentCandidates &&
    !!sessionId &&
    !!env.apiUrl &&
    !env.useStaticData;

  const query = useQuery({
    queryKey: ['session', sessionId, 'assignment-candidates'],
    queryFn: () => fetchAssignmentCandidates(sessionId!),
    enabled,
    placeholderData: (previousData) => previousData,
  });

  return {
    students: query.data?.students ?? [],
    tutors: query.data?.tutors ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),
    isEnabled: showAssignmentCandidates,
  };
}
