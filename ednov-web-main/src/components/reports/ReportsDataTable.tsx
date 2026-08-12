import * as React from 'react';
import { Filter, FileText, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/lib/toast';
import { Spinner } from '@/components/ui/spinner';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { ReportRow } from './ReportRow';
import { ReportCard } from './ReportCard';
import { ReportFiltersContent } from './ReportFilters';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { ValidateModal } from '@/components/modals/ValidateModal';
import { ReportValidateWaitModal } from '@/components/modals/ReportValidateWaitModal';
import { useDataTable } from '@/hooks/useDataTable';
import {
  getAllReports,
  deleteReport,
  validateReport,
  exportReportsExcel,
} from '@/services/reports.service';
import { getSession } from '@/services/sessions.service';
import { usePageActions } from '@/hooks/usePageActions';
import { cn } from '@/lib/utils';
import {
  DEFAULT_REPORT_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type ReportFilters,
} from './report-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { SessionReport } from '@/types/report.types';
import { ReportDetailContent } from '@/components/reports/ReportDetailContent';
import {
  buildValidateWaitOptions,
  shouldShowValidateWaitModal,
  type ValidateWaitOptions,
} from '@/utils/report-author-feedback';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { useAssistantLauncher } from '@/features/copilot';
import { toLocalDateString } from '@/lib/date-utils';

interface ReportsDataTableProps {
  reports?: SessionReport[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditReport?: (sessionId: string, reportId: string) => void;
  /** Wires focused report into Copilot ApplicationContext. */
  onFocusedReportChange?: (report: {
    id: string;
    sessionId: string;
    status?: string | null;
    sessionDisplayName?: string | null;
    authorName?: string | null;
  }) => void;
  enableFilters?: boolean;
  defaultFilters?: ReportFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canValidate?: boolean };
  /** Depuis l’URL (ex. lien notification) : filtre API + fetch détail si la ligne n’est pas sur la page courante. */
  deepLinkSessionId?: string | null;
}

export const ReportsDataTable: React.FC<ReportsDataTableProps> = ({
  reports: externalReports,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditReport,
  onFocusedReportChange,
  enableFilters = true,
  defaultFilters = DEFAULT_REPORT_FILTERS,
  layoutWidth: layoutWidthProp = 'full',
  isSection = false,
  pageActions,
  deepLinkSessionId = null,
}) => {
  const queryClient = useQueryClient();
  const { setFilters, patchContext } = useAssistantLauncher();

  // deleteId et validateId ont un type composite – gérés localement
  const [deleteId, setDeleteId] = React.useState<{
    sessionId: string;
    reportId: string;
  } | null>(null);
  const [validateId, setValidateId] = React.useState<{
    sessionId: string;
    reportId: string;
  } | null>(null);
  const [validateWaitId, setValidateWaitId] = React.useState<{
    sessionId: string;
    reportId: string;
    validateOptions: ValidateWaitOptions;
  } | null>(null);

  const { user } = useConnectedUser();

  const dt = useDataTable<ReportFilters, string>({
    tableName: 'reports',
    defaultFilters,
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
    layoutWidth: layoutWidthProp,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['reports', dt.currentPage, dt.itemsPerPage, dt.filters, deepLinkSessionId],
    queryFn: async () => {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      const sessionIdFilter = deepLinkSessionId?.trim() || undefined;
      const skipDateRange = !!sessionIdFilter;

      if (dt.filters.customDateFrom || dt.filters.customDateTo) {
        dateFrom = dt.filters.customDateFrom;
        dateTo = dt.filters.customDateTo;
      } else if (!skipDateRange && dt.filters.dateRange !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dt.filters.dateRange) {
          case 'week': {
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
            dateFrom = startOfWeek;
            dateTo = new Date(startOfWeek);
            dateTo.setDate(dateTo.getDate() + 7);
            break;
          }
          case 'month': {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          }
          case 'year': {
            dateFrom = new Date(now.getFullYear(), 0, 1);
            dateTo = new Date(now.getFullYear(), 11, 31);
            break;
          }
        }
      }

      return await getAllReports({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        ratings: dt.filters.ratings.length > 0 ? dt.filters.ratings : undefined,
        dateFrom,
        dateTo,
        sessionTypes: dt.filters.sessionTypes?.length > 0 ? dt.filters.sessionTypes : undefined,
        establishmentIds:
          dt.filters.establishmentIds?.length > 0 ? dt.filters.establishmentIds : undefined,
        search: dt.filters.search || undefined,
        sessionId: sessionIdFilter,
      });
    },
    enabled: !externalReports,
  });

  const data = React.useMemo(
    () => externalReports ?? (apiResponse?.data || []),
    [externalReports, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalReports ? data.length === 0 : !isLoading && totalItems === 0),
    [externalReports, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucun rapport à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;
      if (dt.filters.dateRange !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (dt.filters.dateRange) {
          case 'week': {
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
            dateFrom = startOfWeek;
            dateTo = new Date(startOfWeek);
            dateTo.setDate(dateTo.getDate() + 7);
            break;
          }
          case 'month': {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          }
          case 'year': {
            dateFrom = new Date(now.getFullYear(), 0, 1);
            dateTo = new Date(now.getFullYear(), 11, 31);
            break;
          }
        }
      }
      await exportReportsExcel({
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        ratings: dt.filters.ratings.length > 0 ? dt.filters.ratings : undefined,
        dateFrom,
        dateTo,
        sessionTypes: dt.filters.sessionTypes?.length > 0 ? dt.filters.sessionTypes : undefined,
        establishmentIds:
          dt.filters.establishmentIds?.length > 0 ? dt.filters.establishmentIds : undefined,
      });
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [dt.filters, isEmptyForExport]);

  const expandedReportFromPage = React.useMemo(
    () => (expandedRowId ? (data.find((r) => r.id === expandedRowId) ?? null) : null),
    [expandedRowId, data],
  );

  const sessionIdForExpandedFetch =
    expandedReportFromPage?.session?.id ?? deepLinkSessionId?.trim() ?? null;

  const needsFullReportFetch = !!expandedRowId && !data.some((r) => r.id === expandedRowId);

  const { data: expandedReportData, isLoading: isExpandedReportLoading } = useQuery({
    queryKey: ['reports', sessionIdForExpandedFetch, expandedRowId],
    queryFn: async () => {
      if (!expandedRowId || !sessionIdForExpandedFetch) return null;
      const { getReport } = await import('@/services/reports.service');
      return await getReport(sessionIdForExpandedFetch, expandedRowId);
    },
    enabled: needsFullReportFetch && !!expandedRowId && !!sessionIdForExpandedFetch,
    staleTime: 5 * 60 * 1000,
  });

  const { canValidate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('reports');
  const canExport = canExportCsv; // Alias pour cohérence avec le code existant

  const deleteMutation = useMutation({
    mutationFn: ({ sessionId, reportId }: { sessionId: string; reportId: string }) =>
      deleteReport(sessionId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Rapport supprimé avec succès !');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du rapport');
    },
  });

  const validateMutation = useMutation({
    mutationFn: ({ sessionId, reportId }: { sessionId: string; reportId: string }) =>
      validateReport(sessionId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Compte rendu validé avec succès !');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la validation du compte rendu');
    },
  });

  const handleDeleteClick = React.useCallback((sessionId: string, reportId: string) => {
    setDeleteId({ sessionId, reportId });
  }, []);

  const handleValidateClick = React.useCallback(
    async (sessionId: string, reportId: string) => {
      const report = data.find((r) => r.id === reportId);
      if (!report) return;
      let session = null;
      try {
        session = await getSession(sessionId);
      } catch {
        // Participants indisponibles : décompte sur authorFeedbacks uniquement
      }
      const validateOptions = buildValidateWaitOptions(report, session, user?.id);
      if (shouldShowValidateWaitModal(report, validateOptions)) {
        setValidateWaitId({ sessionId, reportId, validateOptions });
        return;
      }
      setValidateId({ sessionId, reportId });
    },
    [data, user?.id],
  );

  const handleValidateWaitConfirm = React.useCallback(() => {
    if (!validateWaitId) return;
    validateMutation.mutate({
      sessionId: validateWaitId.sessionId,
      reportId: validateWaitId.reportId,
    });
    setValidateWaitId(null);
  }, [validateWaitId, validateMutation]);

  const handleValidateConfirm = React.useCallback(() => {
    if (!validateId) return;
    validateMutation.mutate(validateId);
    setValidateId(null);
  }, [validateId, validateMutation]);

  const reportToDelete = React.useMemo(
    () => (deleteId ? data.find((r) => r.id === deleteId.reportId) : null),
    [deleteId, data],
  );

  const reportToValidate = React.useMemo(
    () => (validateId ? data.find((r) => r.id === validateId.reportId) : null),
    [validateId, data],
  );

  const reportToValidateWait = React.useMemo(
    () => (validateWaitId ? data.find((r) => r.id === validateWaitId.reportId) : null),
    [validateWaitId, data],
  );

  const hasActiveFilters = React.useMemo(
    () => JSON.stringify(dt.filters) !== JSON.stringify(defaultFilters),
    [dt.filters, defaultFilters],
  );

  const toggleStatusFilter = React.useCallback(
    (status: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        statuses: prev.statuses.includes(status)
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleRatingFilter = React.useCallback(
    (rating: number) => {
      dt.setFilters((prev) => ({
        ...prev,
        ratings: prev.ratings.includes(rating)
          ? prev.ratings.filter((r) => r !== rating)
          : [...prev.ratings, rating],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setDateRange = React.useCallback(
    (range: ReportFilters['dateRange']) => {
      dt.setFilters((prev) => ({ ...prev, dateRange: range }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCustomDateRange = React.useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      dt.setFilters((prev) => ({ ...prev, customDateFrom: from, customDateTo: to }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleSessionTypeFilter = React.useCallback(
    (type: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        sessionTypes: prev.sessionTypes?.includes(type)
          ? prev.sessionTypes.filter((t) => t !== type)
          : [...(prev.sessionTypes || []), type],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setEstablishmentFilter = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({
        ...prev,
        establishmentIds: id ? [id] : [],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setSearch = React.useCallback(
    (value: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, search: value }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const filtersContent = React.useMemo(
    () => (
      <ReportFiltersContent
        filters={dt.filters}
        allowedFilterIds={dt.allowedFilterIds}
        visibleFilterIds={dt.visibleFilterIds}
        onToggleStatus={toggleStatusFilter}
        onToggleRating={toggleRatingFilter}
        onSetDateRange={setDateRange}
        onSetCustomDateRange={setCustomDateRange}
        onToggleSessionType={toggleSessionTypeFilter}
        onSetEstablishment={setEstablishmentFilter}
        onSetSearch={setSearch}
      />
    ),
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleStatusFilter,
      toggleRatingFilter,
      setDateRange,
      setCustomDateRange,
      toggleSessionTypeFilter,
      setEstablishmentFilter,
      setSearch,
    ],
  );

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => filtersContent,
      },
    ],
    [filtersContent],
  );

  const expandedReport = React.useMemo(
    () => data.find((r) => r.id === expandedRowId) ?? expandedReportData ?? null,
    [expandedRowId, data, expandedReportData],
  );

  React.useEffect(() => {
    if (!expandedReport?.id || !expandedReport.sessionId) return;
    onFocusedReportChange?.({
      id: expandedReport.id,
      sessionId: expandedReport.sessionId,
      status: expandedReport.status,
      sessionDisplayName: expandedReport.sessionDisplayName,
      authorName: expandedReport.authorName,
    });
  }, [expandedReport, onFocusedReportChange]);

  React.useEffect(() => {
    if (!enableFilters) return;

    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (dt.filters.customDateFrom || dt.filters.customDateTo) {
      dateFrom = dt.filters.customDateFrom
        ? toLocalDateString(dt.filters.customDateFrom)
        : undefined;
      dateTo = dt.filters.customDateTo
        ? toLocalDateString(dt.filters.customDateTo)
        : undefined;
    } else if (dt.filters.dateRange === 'week') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      dateFrom = toLocalDateString(startOfWeek);
      dateTo = toLocalDateString(endOfWeek);
    } else if (dt.filters.dateRange === 'month') {
      const now = new Date();
      dateFrom = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
      dateTo = toLocalDateString(
        new Date(now.getFullYear(), now.getMonth() + 1, 0),
      );
    }

    setFilters({
      statuses: dt.filters.statuses,
      ratings: dt.filters.ratings,
      sessionTypes: dt.filters.sessionTypes,
      establishmentIds: dt.filters.establishmentIds,
      dateRange: dt.filters.dateRange,
      dateFrom,
      dateTo,
      search: dt.filters.search || undefined,
      sessionId:
        expandedReport?.sessionId || deepLinkSessionId || undefined,
      reportId: expandedReport?.id,
      status: expandedReport?.status,
    });
    patchContext({
      search: dt.filters.search || undefined,
      date:
        dateFrom || dateTo
          ? {
              start: dateFrom,
              end: dateTo,
              label:
                dt.filters.dateRange && dt.filters.dateRange !== 'all'
                  ? dt.filters.dateRange
                  : dateFrom && dateTo
                    ? `${dateFrom} → ${dateTo}`
                    : dateFrom,
            }
          : undefined,
    });
  }, [
    enableFilters,
    dt.filters,
    deepLinkSessionId,
    expandedReport?.id,
    expandedReport?.sessionId,
    expandedReport?.status,
    setFilters,
    patchContext,
  ]);

  const isReportDetailLoading =
    !!expandedRowId && needsFullReportFetch && (isExpandedReportLoading || !expandedReport);

  const renderReportDetailsPanel = React.useCallback(
    () => <ReportDetailContent report={expandedReport} isReportLoading={isReportDetailLoading} />,
    [expandedReport, isReportDetailLoading],
  );

  return (
    <DataTable
      data={data}
      totalItems={totalItems}
      isLoading={isLoading}
      viewMode={dt.viewMode}
      onViewModeChange={dt.handleViewModeChange}
      currentPage={dt.currentPage}
      totalPages={totalPages}
      startIndex={startIndex}
      endIndex={endIndex}
      itemLabel="compte(s) rendu(s)"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={6}
      toolbarActions={
        <>
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => dt.setShowFilters((prev) => !prev)}
            />
          )}
          {canExport && (
            <Button
              preset="toolbar-export"
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucun rapport à exporter avec les filtres actuels.'
                  : 'Exporter la liste des rapports en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
        </>
      }
      filtersPanel={
        enableFilters ? (
          <DataTableFilters
            show={dt.showFilters}
            hasActiveFilters={hasActiveFilters}
            filterGroups={filterGroups}
            onClearFilters={dt.clearFilters}
            resultCount={totalItems}
            resultLabel="compte(s) rendu(s)"
            onToggleConfigure={
              dt.allowedFilterIds.length > 0 ? () => dt.setShowConfigure((v) => !v) : undefined
            }
            showConfigure={dt.showConfigure}
            configureContent={
              <div className="flex flex-wrap gap-3">
                {ALL_FILTER_GROUP_IDS.filter((id) => dt.allowedFilterIds.includes(id)).map((id) => {
                  const isOn = dt.filterVisibility[id] ?? true;
                  return (
                    <Button
                      key={id}
                      variant="custom"
                      size="sm"
                      onClick={() => dt.handleToggleFilterVisibility(id)}
                      disabled={dt.isSavingFilterVisibility}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                        dt.isSavingFilterVisibility && 'opacity-60 cursor-not-allowed',
                        isOn
                          ? 'bg-[var(--color-2-nuance-1)] border-[var(--color-2-nuance-1)] text-white'
                          : 'bg-transparent border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] text-muted-foreground hover:border-[var(--color-1-nuance-2)]',
                      )}
                    >
                      {FILTER_GROUP_LABELS[id]}
                    </Button>
                  );
                })}
              </div>
            }
          />
        ) : undefined
      }
      renderTableHead={() => (
        <tr>
          <th>Séance</th>
          <th>Auteur</th>
          <th>Note</th>
          <th>Statut</th>
          <th>Date</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(report) => (
        <ReportRow
          report={report}
          onView={onToggleRow ? () => onToggleRow(report.id) : undefined}
          onEdit={onEditReport ? () => onEditReport(report.sessionId, report.id) : undefined}
          onDelete={() => handleDeleteClick(report.sessionId, report.id)}
          onValidate={() => handleValidateClick(report.sessionId, report.id)}
          canValidate={canValidate}
          pageActions={{ canEditRow, canDeleteRow }}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={() => renderReportDetailsPanel()}
      renderCard={(report) => (
        <ReportCard
          report={report}
          onView={onToggleRow ? () => onToggleRow(report.id) : undefined}
          onEdit={onEditReport ? () => onEditReport(report.sessionId, report.id) : undefined}
          onDelete={() => handleDeleteClick(report.sessionId, report.id)}
          onValidate={() => handleValidateClick(report.sessionId, report.id)}
          canValidate={canValidate}
          pageActions={{ canEditRow, canDeleteRow }}
        />
      )}
      emptyIcon={FileText}
      emptyText="Aucun compte rendu trouvé"
      title="Comptes-rendus"
      isSection={isSection}
      expandedItem={expandedReport}
      isDetailsPanelOpen={!!expandedRowId}
      onCloseDetails={onCloseDetails}
      renderDetailsPanel={renderReportDetailsPanel}
      modals={
        <>
          <DeleteModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={() => {
              if (deleteId) deleteMutation.mutate(deleteId);
            }}
            itemName={(() => {
              if (!reportToDelete) return 'ce rapport';
              const dateStr = reportToDelete.session?.sessionDate
                ? format(new Date(reportToDelete.session.sessionDate), 'd MMMM yyyy', {
                    locale: fr,
                  })
                : 'date inconnue';
              return `le rapport de la séance du ${dateStr}`;
            })()}
            isLoading={deleteMutation.isPending}
          />
          <ReportValidateWaitModal
            open={!!validateWaitId}
            onClose={() => setValidateWaitId(null)}
            onConfirm={handleValidateWaitConfirm}
            report={reportToValidateWait}
            validateOptions={validateWaitId?.validateOptions}
            isLoading={validateMutation.isPending}
          />
          <ValidateModal
            open={!!validateId}
            onClose={() => setValidateId(null)}
            onConfirm={handleValidateConfirm}
            itemName={(() => {
              if (!reportToValidate) return 'ce rapport';
              const dateStr = reportToValidate.session?.sessionDate
                ? format(new Date(reportToValidate.session.sessionDate), 'd MMMM yyyy', {
                    locale: fr,
                  })
                : 'date inconnue';
              return `le rapport de la séance du ${dateStr}`;
            })()}
            isLoading={validateMutation.isPending}
          />
        </>
      }
    />
  );
};
