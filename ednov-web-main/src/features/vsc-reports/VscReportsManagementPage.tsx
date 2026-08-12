import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { VscReportsDataTable } from '@/components/vsc-reports/VscReportsDataTable';
import { CreateVscReportView } from '@/components/vsc-reports/CreateVscReportView';
import { EditVscDailyReportView } from '@/components/vsc-reports/EditVscDailyReportView';
import { CollapseReplaceWrapper } from '@/components/common/CollapseReplaceWrapper';
import { useDetailsView } from '@/components/common/details';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { DEFAULT_VSC_DAILY_PAGE_FILTERS } from '@/components/vsc-reports/vsc-report-configs';
import { usePageActions } from '@/hooks/usePageActions';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';
import { getVscDailyReport } from '@/services/vsc-daily-reports.service';
import { mapVscDailyReportToTableRow } from '@/components/vsc-reports/map-vsc-daily-to-table-row';

type ActiveForm = 'create' | 'edit-daily' | null;

export const VscReportsManagementPage: React.FC = () => {
  const { canCreate } = usePageActions('vsc-reports');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editDailyReportId, setEditDailyReportId] = React.useState<string | null>(null);
  const { openRowId, openRow, setOpenRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('vsc-reports-management');
  const contentRef = React.useRef<HTMLDivElement>(null);

  const [deepLinkReportId, setDeepLinkReportId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (viewId) {
      setOpenRow(viewId);
      setDeepLinkReportId(viewId);
      setActiveForm(null);
      setEditDailyReportId(null);
    }

    if (shouldCreate) {
      setActiveForm('create');
      setEditDailyReportId(null);
      closeRow();
    }

    if (
      viewId ||
      searchParams.has('reportDate') ||
      searchParams.has('establishmentId') ||
      shouldCreate
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('view');
          next.delete('reportDate');
          next.delete('establishmentId');
          next.delete('create');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, closeRow, setOpenRow, setSearchParams]);

  const { data: deepLinkRaw, isLoading: isLoadingDeepLink } = useQuery({
    queryKey: ['vsc-daily-report', 'deep-link', deepLinkReportId],
    queryFn: () => getVscDailyReport(deepLinkReportId!),
    enabled: !!deepLinkReportId,
    staleTime: 5 * 60 * 1000,
  });

  const deepLinkRows = React.useMemo(
    () => (deepLinkRaw ? [mapVscDailyReportToTableRow(deepLinkRaw)] : []),
    [deepLinkRaw],
  );

  const prevOpenRowIdRef = React.useRef(openRowId);
  React.useEffect(() => {
    if (prevOpenRowIdRef.current !== null && openRowId === null) {
      setDeepLinkReportId(null);
    }
    prevOpenRowIdRef.current = openRowId;
  }, [openRowId]);

  const clearDeepLink = React.useCallback(() => {
    setDeepLinkReportId(null);
    closeRow();
  }, [closeRow]);

  const closeForm = React.useCallback(() => {
    setActiveForm(null);
    setEditDailyReportId(null);
    void queryClient.invalidateQueries({ queryKey: ['vsc-reports'] });
    void queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
  }, [queryClient]);

  const handleEditDailyReport = React.useCallback(
    (reportId: string) => {
      setEditDailyReportId(reportId);
      setActiveForm('edit-daily');
      closeRow();
    },
    [closeRow],
  );

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
      return <CreateVscReportView onClose={closeForm} onSuccess={closeForm} />;
    }
    if (activeForm === 'edit-daily' && editDailyReportId) {
      return <EditVscDailyReportView reportId={editDailyReportId} onClose={closeForm} />;
    }
    return null;
  }, [activeForm, editDailyReportId, closeForm]);

  return (
    <ManagementPage
      title="Gestion des Rapports VSC"
      subtitle="Consultez, modifiez et gérez tous vos rapports de suivi VSC."
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setActiveForm('create');
              setEditDailyReportId(null);
              closeRow();
            }}
          >
            Créer un rapport VSC
          </Button>
        ) : undefined
      }
    >
      <CollapseReplaceWrapper
        mode="replace"
        isOpen={activeForm !== null}
        onToggle={closeForm}
        collapsePosition="top"
        formContent={formContent}
      >
        {deepLinkReportId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">
              <span>Vous consultez un rapport spécifique (ouvert depuis une notification).</span>
              <Button variant="ghost" size="sm" onClick={clearDeepLink}>
                <X className="mr-1 h-4 w-4" /> Voir tous les rapports
              </Button>
            </div>
            {isLoadingDeepLink && deepLinkRows.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <VscReportsDataTable
                variant="daily"
                reports={deepLinkRows}
                expandedRowId={openRowId}
                onToggleRow={openRow}
                onCloseDetails={closeRow}
                onEditDailyReport={handleEditDailyReport}
                enableFilters={false}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            )}
          </div>
        ) : (
          <VscReportsDataTable
            variant="daily"
            expandedRowId={openRowId}
            onToggleRow={openRow}
            onCloseDetails={closeRow}
            onEditDailyReport={handleEditDailyReport}
            enableFilters
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            defaultFilters={DEFAULT_VSC_DAILY_PAGE_FILTERS}
          />
        )}
      </CollapseReplaceWrapper>
    </ManagementPage>
  );
};
