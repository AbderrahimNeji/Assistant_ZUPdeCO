import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CollapseReplaceWrapper } from '@/components/common/CollapseReplaceWrapper';
import { ReportsDataTable } from '@/components/reports/ReportsDataTable';
import { CreateReportView } from '@/components/reports/CreateReportView';
import { EditReportView } from '@/components/reports/EditReportView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { Button } from '@/components/forms/Button';
import { getReport } from '@/services/reports.service';
import { Spinner } from '@/components/ui/spinner';
import { X } from 'lucide-react';
import { useAssistantLauncher, AskCopilotButton } from '@/features/copilot';

type ActiveForm = 'create' | 'edit' | null;

export const ReportsManagementPage: React.FC = () => {
  const { canCreate } = usePageActions('reports');
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editReportData, setEditReportData] = React.useState<{
    sessionId: string;
    reportId: string;
  } | null>(null);
  const { openRowId, openRow, setOpenRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('reports-management');
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [, setSearchParams] = useSearchParams();
  const [deepLink, setDeepLink] = React.useState<{
    reportId: string;
    sessionId: string;
  } | null>(null);
  const { setSelection, setEntity, clearSelection, setFilters } =
    useAssistantLauncher();

  React.useEffect(() => {
    const viewId = searchParams.get('view');
    const sessionIdParam = searchParams.get('sessionId');
    const shouldCreate = searchParams.get('create') === 'true';

    if (viewId && sessionIdParam) {
      setOpenRow(viewId);
      setDeepLink({ reportId: viewId, sessionId: sessionIdParam });
      setActiveForm(null);
      setEditReportData(null);
    } else if (viewId) {
      setOpenRow(viewId);
      setActiveForm(null);
      setEditReportData(null);
    }

    if (shouldCreate) {
      setActiveForm('create');
      setEditReportData(null);
      closeRow();
    }

    if (viewId || sessionIdParam || shouldCreate) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('view');
          next.delete('sessionId');
          next.delete('create');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, closeRow, setOpenRow, setSearchParams]);

  const applyReportContext = React.useCallback(
    (report: {
      id: string;
      sessionId: string;
      status?: string | null;
      sessionDisplayName?: string | null;
      authorName?: string | null;
    }) => {
      const sessionLabel =
        report.sessionDisplayName?.trim() ||
        `Séance ${report.sessionId.slice(0, 8)}`;
      const reportLabel = [
        report.status ? `CR ${report.status}` : 'Compte-rendu',
        sessionLabel,
      ]
        .filter(Boolean)
        .join(' — ');
      const reportRef = {
        type: 'report' as const,
        id: report.id,
        label: reportLabel,
      };
      const sessionRef = {
        type: 'session' as const,
        id: report.sessionId,
        label: sessionLabel,
      };
      setSelection(reportRef, [reportRef, sessionRef]);
      setEntity('report', reportRef);
      setEntity('session', sessionRef);
      setFilters({
        sessionId: report.sessionId,
        reportId: report.id,
        status: report.status ?? undefined,
      });
    },
    [setSelection, setEntity, setFilters],
  );

  const { data: deepLinkReport, isLoading: isLoadingDeepLinkReport } = useQuery({
    queryKey: ['reports', 'deep-link', deepLink?.sessionId, deepLink?.reportId],
    queryFn: () => getReport(deepLink!.sessionId, deepLink!.reportId),
    enabled: !!deepLink,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    let cancelled = false;

    if (editReportData) {
      const lists = queryClient.getQueriesData<{
        data?: Array<{
          id?: string;
          sessionId?: string;
          status?: string | null;
          sessionDisplayName?: string | null;
          authorName?: string | null;
        }>;
      }>({ queryKey: ['reports'] });
      let cached:
        | {
            status?: string | null;
            sessionDisplayName?: string | null;
            authorName?: string | null;
          }
        | undefined;
      for (const [, payload] of lists) {
        const hit = payload?.data?.find((r) => r.id === editReportData.reportId);
        if (hit) {
          cached = hit;
          break;
        }
      }
      applyReportContext({
        id: editReportData.reportId,
        sessionId: editReportData.sessionId,
        status: cached?.status,
        sessionDisplayName: cached?.sessionDisplayName,
        authorName: cached?.authorName,
      });
      void (async () => {
        try {
          const report = await getReport(
            editReportData.sessionId,
            editReportData.reportId,
          );
          if (cancelled) return;
          applyReportContext({
            id: report.id,
            sessionId: report.sessionId,
            status: report.status,
            sessionDisplayName: report.sessionDisplayName,
            authorName: report.authorName,
          });
        } catch {
          // Keep cache/fallback label — never invent.
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (deepLinkReport) {
      applyReportContext({
        id: deepLinkReport.id,
        sessionId: deepLinkReport.sessionId,
        status: deepLinkReport.status,
        sessionDisplayName: deepLinkReport.sessionDisplayName,
        authorName: deepLinkReport.authorName,
      });
      return;
    }
    if (deepLink) {
      applyReportContext({
        id: deepLink.reportId,
        sessionId: deepLink.sessionId,
      });
      return;
    }
    if (!openRowId && !editReportData) {
      clearSelection();
      setEntity('report', undefined);
      // List filters stay owned by ReportsDataTable ApplicationContext sync.
    }
  }, [
    editReportData,
    deepLink,
    deepLinkReport,
    openRowId,
    applyReportContext,
    clearSelection,
    setEntity,
    queryClient,
  ]);

  const prevOpenRowIdRef = React.useRef(openRowId);
  React.useEffect(() => {
    if (prevOpenRowIdRef.current !== null && openRowId === null) {
      setDeepLink(null);
    }
    prevOpenRowIdRef.current = openRowId;
  }, [openRowId]);

  const clearDeepLink = React.useCallback(() => {
    setDeepLink(null);
    closeRow();
  }, [closeRow]);

  const closeForm = React.useCallback(() => {
    setActiveForm(null);
    setEditReportData(null);
  }, []);

  const handleEditReport = React.useCallback(
    (sessionId: string, reportId: string) => {
      setEditReportData({ sessionId, reportId });
      setActiveForm('edit');
      closeRow();
    },
    [closeRow],
  );

  React.useEffect(() => {
    const state = location.state as { editReport?: { sessionId: string; reportId: string } } | null;
    if (state?.editReport) {
      const { sessionId, reportId } = state.editReport;
      handleEditReport(sessionId, reportId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, handleEditReport]);

  // Scroll to top when form opens (track previous value)
  const prevActiveFormRef = React.useRef(activeForm);
  React.useEffect(() => {
    if (prevActiveFormRef.current !== activeForm && activeForm !== null && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevActiveFormRef.current = activeForm;
  }, [activeForm]);

  const formContent = React.useMemo(() => {
    if (activeForm === 'create') {
      return (
        <CreateReportView
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['reports'] });
          }}
        />
      );
    }
    if (activeForm === 'edit' && editReportData) {
      return (
        <EditReportView
          sessionId={editReportData.sessionId}
          reportId={editReportData.reportId}
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['reports'] });
          }}
        />
      );
    }
    return null;
  }, [activeForm, editReportData, closeForm, queryClient]);

  return (
    <ManagementPage
      title="Gestion des Comptes Rendus"
      subtitle="Créez, modifiez et gérez tous vos comptes rendus de séances"
      contentRef={contentRef}
      actions={
        <div className="flex items-center gap-3">
          {(editReportData || openRowId || deepLink) && (
            <AskCopilotButton prompt="Summarize this report, explain validation, and show missing information." />
          )}
          {canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setActiveForm('create');
              setEditReportData(null);
              closeRow();
            }}
          >
            Créer un compte rendu
          </Button>
          ) : null}
        </div>
      }
    >
      <CollapseReplaceWrapper
        mode="replace"
        isOpen={activeForm !== null}
        onToggle={closeForm}
        collapsePosition="top"
        formContent={formContent}
      >
        {deepLink ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">
              <span>
                Vous consultez un compte rendu spécifique (ouvert depuis une notification).
              </span>
              <Button variant="ghost" size="sm" onClick={clearDeepLink}>
                <X className="mr-1 h-4 w-4" /> Voir tous les comptes rendus
              </Button>
            </div>
            {isLoadingDeepLinkReport && !deepLinkReport ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <ReportsDataTable
                reports={deepLinkReport ? [deepLinkReport] : []}
                expandedRowId={openRowId}
                onToggleRow={openRow}
                onCloseDetails={closeRow}
                onEditReport={handleEditReport}
                onFocusedReportChange={applyReportContext}
                enableFilters={false}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            )}
          </div>
        ) : (
          <ReportsDataTable
            expandedRowId={openRowId}
            onToggleRow={openRow}
            onCloseDetails={closeRow}
            onEditReport={handleEditReport}
            onFocusedReportChange={applyReportContext}
            enableFilters
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </CollapseReplaceWrapper>
    </ManagementPage>
  );
};
