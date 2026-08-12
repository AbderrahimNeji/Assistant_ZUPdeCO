import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CompteRendu } from '@/types/compteRendu';
import { submitCrAsSubmitted } from '@/services/comptesRendus';

export function useSubmitCrAsSubmitted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cr: CompteRendu) => submitCrAsSubmitted(cr),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['compte-rendu', variables.id, variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'hours-total'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'report-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'period-total'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });
}
