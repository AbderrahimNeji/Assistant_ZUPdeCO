import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { getReports } from '@/services/reports.service';

export const useNavigateToReport = () => {
  const navigate = useNavigate();
  const [pendingSessionId, setPendingSessionId] = React.useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['session-report', pendingSessionId],
    queryFn: () => getReports(pendingSessionId!),
    enabled: !!pendingSessionId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  React.useEffect(() => {
    if (!pendingSessionId || isLoading) return;

    if (reports?.length && reports.length > 0) {
      const report = reports[0];
      navigate('/dashboard/reports', {
        state: {
          editReport: { sessionId: pendingSessionId, reportId: report.id },
        },
      });
      setPendingSessionId(null);
    } else if (reports?.length === 0) {
      toast.info("Aucun compte rendu n'existe pour cette séance");
      setPendingSessionId(null);
    }
  }, [reports, isLoading, pendingSessionId, navigate]);

  const navigateToReport = React.useCallback((sessionId: string) => {
    setPendingSessionId(sessionId);
  }, []);

  return { navigateToReport, isLoading };
};
