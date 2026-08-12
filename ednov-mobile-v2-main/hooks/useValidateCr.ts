import { useMutation, useQueryClient } from '@tanstack/react-query';

import { validateSessionReport } from '@/services/comptesRendus';

export function useValidateCr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      reportId,
      validatedById,
    }: {
      sessionId: string;
      reportId: string;
      validatedById: string;
    }) => validateSessionReport(sessionId, reportId, validatedById),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
      queryClient.invalidateQueries({ queryKey: ['compte-rendu', variables.reportId, variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'report-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });
}
