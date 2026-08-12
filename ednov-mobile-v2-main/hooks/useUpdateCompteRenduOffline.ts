import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSessionReport } from '@/services/comptesRendus';
import { useOfflineQueueStore, type CrUpdatePayload } from '@/store/offlineQueueStore';
import { isNetworkError } from '@/utils/networkError';
import type { CompteRenduAuthorFeedback } from '@/types/compteRendu';
import type { SessionReportParticipantAttendanceItem } from '@/utils/sessionReportParticipants';

export interface UpdateCrOfflineInput {
  sessionId: string;
  reportId: string;
  matiereIds: string[];
  authorFeedbacks: CompteRenduAuthorFeedback[];
  participants?: SessionReportParticipantAttendanceItem[];
}

/**
 * Mutation hook for editing a CR.
 * On network failure the update is enqueued in the offline queue (cr_update)
 * and will be replayed when connectivity is restored.
 */
export function useUpdateCompteRenduOffline() {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);

  return useMutation({
    networkMode: 'always',
    mutationFn: ({ sessionId, reportId, matiereIds, authorFeedbacks, participants }: UpdateCrOfflineInput) => {
      return updateSessionReport(sessionId, reportId, {
        authorFeedbacks,
        subjectIds: matiereIds,
        status: 'submitted',
        ...(participants?.length ? { participants } : {}),
      });
    },
    onSuccess: (_data, { sessionId, participants }) => {
      queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'report-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      if (participants?.length) {
        queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'participants'] });
      }
    },
    onError: (error, variables) => {
      if (isNetworkError(error)) {
        const queuePayload: CrUpdatePayload = {
          reportId: variables.reportId,
          sessionId: variables.sessionId,
          matiereIds: variables.matiereIds,
          authorFeedbacks: variables.authorFeedbacks,
          ...(variables.participants?.length ? { participants: variables.participants } : {}),
        };
        enqueue({ type: 'cr_update', payload: queuePayload });
      }
    },
  });
}
