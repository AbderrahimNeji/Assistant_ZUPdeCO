import * as React from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';
import { VscReportRow } from './VscReportRow';
import { VscReportCard } from './VscReportCard';
import { VscReportFiltersContent } from './VscReportFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { VscDailyReportDetailsPanel } from '@/components/common/details/content-renderers/renderVscDailyReportContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { ValidateModal } from '@/components/modals/ValidateModal';
import { useDataTable } from '@/hooks/useDataTable';

import { deleteVscReport, validateVscReport } from '@/services/vsc-reports.service';
import {
  getAllVscDailyReports,
  getVscDailyReport,
  validateVscDailyReport,
  exportVscDailyReportsExcel,
  deleteVscDailyReport,
} from '@/services/vsc-daily-reports.service';
import { usePageActions } from '@/hooks/usePageActions';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { toLocalDateString } from '@/lib/date-utils';
import { mapVscDailyReportToTableRow } from './map-vsc-daily-to-table-row';
import {
  DEFAULT_VSC_REPORT_FILTERS,
  ALL_FILTER_GROUP_IDS,
  ALL_VSC_DAILY_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type FilterGroupId,
} from './vsc-report-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { VscReport, VscReportFilters } from '@/types/vsc-report.types';
import type { PaginatedResponse } from '@/services/users.service';

interface VscReportsDataTableProps {
  /** `daily` = liste depuis `vsc_daily_reports` avec le même tableau que les rapports séance. */
  variant?: 'session' | 'daily';
  reports?: VscReport[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: 'full' | '1/2' | '2/3' | '1/3' | 'auto';
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditReport?: (sessionId: string, reportId: string) => void;
  /** Si défini (ex. page gestion journalière), l’édition ouvre cette vue au lieu du panneau ligne. */
  onEditDailyReport?: (reportId: string) => void;
  enableFilters?: boolean;
  defaultFilters?: VscReportFilters;
  showCreateButton?: boolean;
  onCreateReport?: () => void;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canViewRow?: boolean };
}

const VscReportFiltersRenderer = React.memo<{
  filters: VscReportFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onSetDateRange: (range: VscReportFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetCategory: (category: VscReportFilters['category']) => void;
  onSetEstablishment?: (id: string | undefined) => void;
  onSetSearch?: (value: string | undefined) => void;
}>(
  ({
    filters,
    allowedFilterIds,
    visibleFilterIds,
    onToggleStatus,
    onSetDateRange,
    onSetCustomDateRange,
    onSetCategory,
    onSetEstablishment,
    onSetSearch,
  }) => (
    <VscReportFiltersContent
      filters={filters}
      allowedFilterIds={allowedFilterIds}
      visibleFilterIds={visibleFilterIds}
      onToggleStatus={onToggleStatus}
      onSetDateRange={onSetDateRange}
      onSetCustomDateRange={onSetCustomDateRange}
      onSetCategory={onSetCategory}
      onSetEstablishment={onSetEstablishment}
      onSetSearch={onSetSearch}
    />
  ),
);

function buildDailyApiFilters(
  filters: VscReportFilters,
): Parameters<typeof exportVscDailyReportsExcel>[0] {
  let reportDateFrom: string | undefined;
  let reportDateTo: string | undefined;

  if (filters.customDateFrom || filters.customDateTo) {
    if (filters.customDateFrom) reportDateFrom = toLocalDateString(filters.customDateFrom);
    if (filters.customDateTo) reportDateTo = toLocalDateString(filters.customDateTo);
  } else if (filters.dateRange !== 'all') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.dateRange) {
      case 'today':
        reportDateFrom = reportDateTo = toLocalDateString(startOfToday);
        break;
      case 'week': {
        const from = new Date(startOfToday);
        from.setDate(from.getDate() - 7);
        reportDateFrom = toLocalDateString(from);
        reportDateTo = toLocalDateString(startOfToday);
        break;
      }
      case 'month':
        reportDateFrom = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
        reportDateTo = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'year':
        reportDateFrom = toLocalDateString(new Date(now.getFullYear(), 0, 1));
        reportDateTo = toLocalDateString(new Date(now.getFullYear(), 11, 31));
        break;
      default:
        break;
    }
  }

  const statuses =
    filters.statuses.length > 0
      ? filters.statuses.map((s) =>
          s === 'draft' ? ('to_fill' as const) : (s as 'to_fill' | 'submitted' | 'validated'),
        )
      : undefined;

  const search = filters.search?.trim() || undefined;

  return {
    establishmentId: filters.establishmentId,
    reportDateFrom,
    reportDateTo,
    ...(statuses?.length ? { statuses } : {}),
    ...(search ? { search } : {}),
  };
}

function buildDailyListParams(
  filters: VscReportFilters,
  currentPage: number,
  itemsPerPage: number,
): Parameters<typeof getAllVscDailyReports>[0] {
  return {
    ...buildDailyApiFilters(filters),
    page: currentPage,
    pageSize: itemsPerPage,
  };
}

export const VscReportsDataTable: React.FC<VscReportsDataTableProps> = ({
  variant = 'daily',
  reports: externalReports,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditReport,
  onEditDailyReport,
  enableFilters = true,
  defaultFilters = DEFAULT_VSC_REPORT_FILTERS,
  showCreateButton = false,
  onCreateReport,
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const isDaily = variant === 'daily';

  const rbac = usePageActions('vsc-reports');
  const { canValidate, canExportCsv } = rbac;
  const { isManager, isCoordinator } = useConnectedUser();
  const canValidateDailyReport = canValidate && (isManager || isCoordinator);

  const effectivePageActions = React.useMemo(
    () => ({
      canEditRow: pageActions?.canEditRow ?? rbac.canEditRow,
      canDeleteRow:
        pageActions?.canDeleteRow !== undefined ? pageActions.canDeleteRow : rbac.canDeleteRow,
      canViewRow: pageActions?.canViewRow ?? rbac.canViewRow,
    }),
    [pageActions, rbac],
  );

  const [dailyPresentationMode, setDailyPresentationMode] = React.useState<'view' | 'edit'>('edit');

  React.useEffect(() => {
    if (!expandedRowId) setDailyPresentationMode('edit');
  }, [expandedRowId]);

  const openDailyAsView = React.useCallback(
    (id: string) => {
      setDailyPresentationMode('view');
      onToggleRow?.(id);
    },
    [onToggleRow],
  );

  const openDailyAsEdit = React.useCallback(
    (id: string) => {
      setDailyPresentationMode('edit');
      onToggleRow?.(id);
    },
    [onToggleRow],
  );

  const handleRowView = React.useCallback(
    (report: VscReport) => {
      if (!onToggleRow || !effectivePageActions.canViewRow) return;
      if (report.isDailyReport) openDailyAsView(report.id);
      else onToggleRow(report.id);
    },
    [onToggleRow, effectivePageActions.canViewRow, openDailyAsView],
  );

  const handleRowEdit = React.useCallback(
    (report: VscReport) => {
      if (report.isDailyReport) {
        if (!effectivePageActions.canEditRow || report.status === 'validated') return;
        if (onEditDailyReport) {
          onCloseDetails?.();
          onEditDailyReport(report.id);
          return;
        }
        if (onToggleRow) {
          openDailyAsEdit(report.id);
        }
        return;
      }
      if (
        effectivePageActions.canEditRow &&
        onEditReport &&
        report.sessionId &&
        report.status !== 'validated'
      ) {
        onCloseDetails?.();
        onEditReport(report.sessionId, report.id);
      }
    },
    [
      effectivePageActions.canEditRow,
      onToggleRow,
      onEditReport,
      onCloseDetails,
      onEditDailyReport,
      openDailyAsEdit,
    ],
  );

  const [deleteId, setDeleteId] = React.useState<{
    reportId: string;
    sessionId?: string;
    isDaily: boolean;
  } | null>(null);

  const [validateId, setValidateId] = React.useState<{
    reportId: string;
    sessionId?: string;
  } | null>(null);

  const filterGroupIds = isDaily ? ALL_VSC_DAILY_FILTER_GROUP_IDS : ALL_FILTER_GROUP_IDS;
  const tableName = isDaily ? 'vsc-daily-reports-management' : 'vsc-reports';

  const dt = useDataTable<VscReportFilters, FilterGroupId>({
    tableName,
    defaultFilters,
    allFilterGroupIds: filterGroupIds,
    layoutWidth: layoutWidth as ElementWidth,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const sessionApi: PaginatedResponse<VscReport> | undefined = undefined;
  const sessionLoading = false;

  const { data: dailyApiRaw, isLoading: dailyLoading } = useQuery({
    queryKey: ['vsc-daily-reports', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: () =>
      getAllVscDailyReports(buildDailyListParams(dt.filters, dt.currentPage, dt.itemsPerPage)),
    enabled: !externalReports && isDaily,
    staleTime: 5 * 60 * 1000,
  });

  const apiResponse: PaginatedResponse<VscReport> | undefined = React.useMemo(() => {
    if (externalReports) return undefined;
    if (isDaily) {
      if (!dailyApiRaw) return undefined;
      return {
        ...dailyApiRaw,
        data: dailyApiRaw.data.map(mapVscDailyReportToTableRow),
      };
    }
    return sessionApi as PaginatedResponse<VscReport> | undefined;
  }, [externalReports, isDaily, dailyApiRaw, sessionApi]);

  const isLoading = isDaily ? dailyLoading : sessionLoading;

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
      toast.warning('Aucun rapport VSC à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportVscDailyReportsExcel(buildDailyApiFilters(dt.filters));
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [dt.filters, isEmptyForExport]);

  const expandedVscReportFromPage = React.useMemo(
    () => (expandedRowId ? (data.find((r) => r.id === expandedRowId) ?? null) : null),
    [expandedRowId, data],
  );

  const { data: expandedVscReportData } = useQuery({
    queryKey: ['vsc-reports', expandedVscReportFromPage?.session?.id, expandedRowId],
    queryFn: async () => {
      if (!expandedRowId || !expandedVscReportFromPage?.session?.id) return null;
      const { getVscReport } = await import('@/services/vsc-reports.service');
      return await getVscReport(expandedVscReportFromPage.session.id, expandedRowId);
    },
    enabled:
      !isDaily &&
      !!expandedRowId &&
      !!expandedVscReportFromPage?.session?.id &&
      !data.some((r) => r.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: expandedDailyRaw } = useQuery({
    queryKey: ['vsc-daily-report', expandedRowId],
    queryFn: () => getVscDailyReport(expandedRowId!),
    enabled: isDaily && !!expandedRowId && !data.some((r) => r.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(() => {
    if (isDaily) {
      return (
        dt.filters.statuses.length > 0 ||
        dt.filters.dateRange !== 'month' ||
        !!dt.filters.establishmentId ||
        !!dt.filters.search?.trim()
      );
    }
    return (
      dt.filters.statuses.length > 0 ||
      dt.filters.dateRange !== 'month' ||
      dt.filters.category !== 'all'
    );
  }, [isDaily, dt.filters]);

  const deleteMutation = useMutation({
    mutationFn: (payload: { reportId: string; sessionId?: string; isDaily: boolean }) => {
      if (payload.isDaily) return deleteVscDailyReport(payload.reportId);
      if (!payload.sessionId) {
        return Promise.reject(new Error('sessionId manquant pour la suppression'));
      }
      return deleteVscReport(payload.sessionId, payload.reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsc-reports'] });
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-report'] });
      setDeleteId(null);
      toast.success('Rapport VSC supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const validateMutation = useMutation({
    mutationFn: async ({ reportId, sessionId }: { reportId: string; sessionId?: string }) => {
      if (sessionId) return validateVscReport(sessionId, reportId);
      return validateVscDailyReport(reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsc-reports'] });
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-report'] });
      setValidateId(null);
      toast.success('Rapport VSC validé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la validation');
    },
  });

  const handleDeleteReport = React.useCallback((report: VscReport) => {
    if (report.isDailyReport) {
      setDeleteId({ reportId: report.id, isDaily: true });
    } else if (report.sessionId) {
      setDeleteId({ reportId: report.id, sessionId: report.sessionId, isDaily: false });
    }
  }, []);

  const handleValidateSession = React.useCallback((sessionId: string, reportId: string) => {
    setValidateId({ sessionId, reportId });
  }, []);

  const handleValidateDaily = React.useCallback((reportId: string) => {
    setValidateId({ reportId });
  }, []);

  const vscReportToDelete = React.useMemo(
    () => (deleteId ? data.find((report) => report.id === deleteId.reportId) : null),
    [deleteId, data],
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

  const setDateRange = React.useCallback(
    (range: VscReportFilters['dateRange']) => {
      dt.setFilters((prev) => ({ ...prev, dateRange: range }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCustomDateRange = React.useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      dt.setFilters((prev) => ({
        ...prev,
        customDateFrom: from,
        customDateTo: to,
        dateRange: from || to ? 'all' : prev.dateRange,
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCategory = React.useCallback(
    (category: VscReportFilters['category']) => {
      dt.setFilters((prev) => ({ ...prev, category }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setEstablishment = React.useCallback(
    (establishmentId: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, establishmentId }));
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
      <VscReportFiltersRenderer
        filters={dt.filters}
        allowedFilterIds={dt.allowedFilterIds}
        visibleFilterIds={dt.visibleFilterIds}
        onToggleStatus={toggleStatusFilter}
        onSetDateRange={setDateRange}
        onSetCustomDateRange={setCustomDateRange}
        onSetCategory={setCategory}
        onSetEstablishment={setEstablishment}
        onSetSearch={setSearch}
      />
    ),
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      setSearch,
      toggleStatusFilter,
      setDateRange,
      setCustomDateRange,
      setCategory,
      setEstablishment,
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

  const configureContent = React.useMemo(
    () => (
      <div className="flex flex-wrap gap-3">
        {filterGroupIds
          .filter((id) => dt.allowedFilterIds.includes(id))
          .map((id) => {
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
    ),
    [
      filterGroupIds,
      dt.filterVisibility,
      dt.allowedFilterIds,
      dt.isSavingFilterVisibility,
      dt.handleToggleFilterVisibility,
    ],
  );

  const expandedReport = React.useMemo(() => {
    if (!expandedRowId) return null;
    const fromPage = data.find((r) => r.id === expandedRowId) ?? null;
    if (isDaily && expandedDailyRaw) {
      return mapVscDailyReportToTableRow(expandedDailyRaw);
    }
    if (!isDaily && expandedVscReportData) return expandedVscReportData;
    return fromPage;
  }, [expandedRowId, data, isDaily, expandedDailyRaw, expandedVscReportData]);

  const itemLabelShort = 'rapport(s) VSC';

  const renderExpanded = React.useCallback(
    (report: VscReport) => {
      if (report.isDailyReport && report.dailyPayload) {
        return (
          <VscDailyReportDetailsPanel
            report={report.dailyPayload}
            presentationMode={dailyPresentationMode}
          />
        );
      }
      return <DetailsViewContent data={report} type="vscReport" />;
    },
    [dailyPresentationMode],
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
      itemLabel={itemLabelShort}
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={isDaily ? 6 : 7}
      toolbarActions={
        <>
          {!isDaily && showCreateButton && onCreateReport && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un rapport VSC"
              onClick={() => {
                onCloseDetails?.();
                onCreateReport();
              }}
            />
          )}
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => {
                dt.setShowFilters((prev) => {
                  if (!prev) dt.setShowConfigure(false);
                  return !prev;
                });
              }}
            />
          )}
          {canExportCsv && (
            <Button
              preset="toolbar-export"
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucun rapport VSC à exporter avec les filtres actuels.'
                  : isDaily
                    ? 'Exporter la liste des rapports VSC journaliers en Excel'
                    : 'Exporter la liste des rapports VSC en Excel'
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
            resultLabel={itemLabelShort}
            onToggleConfigure={() => dt.setShowConfigure((prev) => !prev)}
            showConfigure={dt.showConfigure}
            configureContent={configureContent}
          />
        ) : undefined
      }
      renderTableHead={() => (
        <tr>
          <th>Séance</th>
          {!isDaily && <th>Élève</th>}
          <th>VSC</th>
          <th>Statut</th>
          <th>Catégorie</th>
          <th>Date</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(report) => (
        <VscReportRow
          report={report}
          onView={
            onToggleRow && effectivePageActions.canViewRow ? () => handleRowView(report) : undefined
          }
          onEdit={
            report.isDailyReport
              ? effectivePageActions.canEditRow &&
                report.status !== 'validated' &&
                (onEditDailyReport || onToggleRow)
                ? () => handleRowEdit(report)
                : undefined
              : effectivePageActions.canEditRow &&
                  onEditReport &&
                  report.sessionId &&
                  report.status !== 'validated'
                ? () => handleRowEdit(report)
                : undefined
          }
          onDelete={
            effectivePageActions.canDeleteRow && (report.isDailyReport || report.sessionId)
              ? () => handleDeleteReport(report)
              : undefined
          }
          onValidate={
            (report.isDailyReport ? canValidateDailyReport : canValidate)
              ? report.isDailyReport
                ? () => handleValidateDaily(report.id)
                : report.sessionId
                  ? () => handleValidateSession(report.sessionId, report.id)
                  : undefined
              : undefined
          }
          canValidate={report.isDailyReport ? canValidateDailyReport : canValidate}
          pageActions={effectivePageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(report) => renderExpanded(report)}
      renderCard={(report) => (
        <VscReportCard
          report={report}
          onView={
            onToggleRow && effectivePageActions.canViewRow ? () => handleRowView(report) : undefined
          }
          onEdit={
            report.isDailyReport
              ? effectivePageActions.canEditRow &&
                report.status !== 'validated' &&
                (onEditDailyReport || onToggleRow)
                ? () => handleRowEdit(report)
                : undefined
              : effectivePageActions.canEditRow &&
                  onEditReport &&
                  report.sessionId &&
                  report.status !== 'validated'
                ? () => handleRowEdit(report)
                : undefined
          }
          onDelete={
            effectivePageActions.canDeleteRow && (report.isDailyReport || report.sessionId)
              ? () => handleDeleteReport(report)
              : undefined
          }
          onValidate={
            (report.isDailyReport ? canValidateDailyReport : canValidate)
              ? report.isDailyReport
                ? () => handleValidateDaily(report.id)
                : report.sessionId
                  ? () => handleValidateSession(report.sessionId, report.id)
                  : undefined
              : undefined
          }
          canValidate={report.isDailyReport ? canValidateDailyReport : canValidate}
          pageActions={effectivePageActions}
        />
      )}
      emptyIcon={ClipboardList}
      emptyText="Aucun rapport VSC trouvé"
      title="Rapports VSC"
      isSection={isSection}
      expandedItem={expandedReport}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(report) => renderExpanded(report)}
      modals={
        <>
          <DeleteModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={() => {
              if (deleteId) deleteMutation.mutate(deleteId);
            }}
            itemName={
              vscReportToDelete
                ? vscReportToDelete.isDailyReport
                  ? `le rapport VSC journalier pour ${
                      vscReportToDelete.session?.establishment?.name?.trim() || 'cet établissement'
                    }`
                  : `le rapport VSC de ${vscReportToDelete.student?.displayName || 'cet élève'}`
                : 'ce rapport VSC'
            }
            isLoading={deleteMutation.isPending}
          />
          <ValidateModal
            open={!!validateId}
            onClose={() => setValidateId(null)}
            onConfirm={() => {
              if (validateId) void validateMutation.mutateAsync(validateId);
            }}
            itemName="rapport VSC"
            isLoading={validateMutation.isPending}
          />
        </>
      }
    />
  );
};
