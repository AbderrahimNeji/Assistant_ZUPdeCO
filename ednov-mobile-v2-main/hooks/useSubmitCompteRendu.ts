import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  submitCompteRendu,
  type SubmitCompteRenduPayload,
} from '@/services/comptesRendus';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { isNetworkError } from '@/utils/networkError';
import type { CompteRendu } from '@/types/compteRendu';

export function useSubmitCompteRendu() {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const { isOffline } = useNetworkStatus();

  return useMutation({
    networkMode: 'always',
    mutationFn: (payload: SubmitCompteRenduPayload) => {
      if (isOffline) {
        enqueue({ type: 'cr_submit', payload });
        const optimistic: CompteRendu = {
          id: payload.reportId ?? `offline-pending-${Date.now()}`,
          sessionId: payload.sessionId,
          note: payload.note,
          matiereIds: payload.matiereIds,
          commentaire: payload.commentaire,
          feeling: payload.feeling ?? null,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        };
        return Promise.resolve(optimistic);
      }
      return submitCompteRendu(payload);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CompteRendu[]>(['comptes-rendus'], (prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex(
          (cr) => cr.id === variables.reportId || cr.sessionId === variables.sessionId,
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...data };
          return updated;
        }
        return [data, ...prev];
      });
      if (!isOffline) {
        queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['sessions', 'report-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['gamification'] });
        if (variables.participants?.length) {
          queryClient.invalidateQueries({
            queryKey: ['session', variables.sessionId, 'participants'],
          });
        }
      }
    },
    onError: (error, variables) => {
      if (isNetworkError(error)) {
        enqueue({ type: 'cr_submit', payload: variables });
      }
    },
  });
}
