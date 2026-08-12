import * as React from 'react';
import { Filter, Calendar, Download, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { SchoolYearRow } from './SchoolYearRow';
import { SchoolYearCard } from './SchoolYearCard';
import { SchoolYearFiltersContent } from './SchoolYearFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import {
  getSchoolYears,
  deleteSchoolYear,
  exportSchoolYearsExcel,
} from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  ALL_FILTER_GROUP_IDS,
  DEFAULT_SCHOOL_YEAR_FILTERS,
  FILTER_GROUP_LABELS,
  type FilterGroupId,
  type SchoolYearFilters,
} from './school-year-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { SchoolYear } from '@/types/school-year.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface SchoolYearsDataTableProps {
  schoolYears?: SchoolYear[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditSchoolYear?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: SchoolYearFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  showCreateButton?: boolean;
  onCreateSchoolYear?: () => void;
}

export const SchoolYearsDataTable: React.FC<SchoolYearsDataTableProps> = ({
  schoolYears: externalSchoolYears,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditSchoolYear,
  enableFilters = true,
  showCreateButton = false,
  onCreateSchoolYear,
  defaultFilters = DEFAULT_SCHOOL_YEAR_FILTERS,
  layoutWidth = 'full',
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<SchoolYearFilters, FilterGroupId>({
    tableName: 'schoolYears',
    defaultFilters,
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
    layoutWidth,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['schoolYears', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getSchoolYears({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        isCurrent: dt.filters.isCurrent ?? undefined,
        periodPhases: dt.filters.periodPhases.length > 0 ? dt.filters.periodPhases : undefined,
      }),
    enabled: !externalSchoolYears,
  });

  const data = React.useMemo(
    () => externalSchoolYears ?? (apiResponse?.data || []),
    [externalSchoolYears, apiResponse?.data],
  );
  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalSchoolYears ? data.length === 0 : !isLoading && totalItems === 0),
    [externalSchoolYears, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucune année scolaire à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportSchoolYearsExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedSchoolYearData } = useQuery({
    queryKey: ['school-years', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getSchoolYear } = await import('@/services/academic.service');
      return await getSchoolYear(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((sy) => sy.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.isCurrent !== null ||
      dt.filters.periodPhases.length > 0 ||
      !!dt.filters.searchQuery?.trim() ||
      dt.filters.startDateFrom !== undefined ||
      dt.filters.startDateTo !== undefined ||
      dt.filters.endDateFrom !== undefined ||
      dt.filters.endDateTo !== undefined,
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteSchoolYear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
      dt.setDeleteId(null);
      toast.success('Année scolaire supprimée avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const schoolYearToDelete = React.useMemo(
    () => data.find((sy) => sy.id === dt.deleteId),
    [data, dt.deleteId],
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

  const toggleCurrentFilter = React.useCallback(() => {
    dt.setFilters((prev) => ({
      ...prev,
      isCurrent: prev.isCurrent === true ? null : true,
    }));
    dt.setCurrentPage(1);
  }, [dt]);

  const togglePeriodPhaseFilter = React.useCallback(
    (phase: 'ended' | 'upcoming') => {
      dt.setFilters((prev) => ({
        ...prev,
        periodPhases: prev.periodPhases.includes(phase)
          ? prev.periodPhases.filter((p) => p !== phase)
          : [...prev.periodPhases, phase],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setSearchQuery = React.useCallback(
    (query: string) => {
      dt.setFilters((prev) => ({ ...prev, searchQuery: query }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setDateRange = React.useCallback(
    (
      startFrom: Date | undefined,
      startTo: Date | undefined,
      endFrom: Date | undefined,
      endTo: Date | undefined,
    ) => {
      dt.setFilters((prev) => ({
        ...prev,
        startDateFrom: startFrom,
        startDateTo: startTo,
        endDateFrom: endFrom,
        endDateTo: endTo,
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <SchoolYearFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onToggleCurrentFilter={toggleCurrentFilter}
            onTogglePeriodPhase={togglePeriodPhaseFilter}
            onSetSearchQuery={setSearchQuery}
            onSetDateRange={setDateRange}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleStatusFilter,
      toggleCurrentFilter,
      togglePeriodPhaseFilter,
      setSearchQuery,
      setDateRange,
    ],
  );

  const expandedSchoolYear = React.useMemo(
    () => data.find((sy) => sy.id === expandedRowId) ?? expandedSchoolYearData ?? null,
    [expandedRowId, data, expandedSchoolYearData],
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
      itemLabel="années scolaires"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={4}
      toolbarActions={
        <>
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => {
                dt.setShowFilters((prev) => {
                  if (prev) dt.setShowConfigure(false);
                  return !prev;
                });
              }}
            />
          )}
          {showExport && (
            <Button
              preset="toolbar-export"
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucune année scolaire à exporter avec les filtres actuels.'
                  : 'Exporter la liste des années scolaires en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateSchoolYear && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer une année scolaire"
              onClick={() => {
                onCloseDetails?.();
                onCreateSchoolYear();
              }}
            />
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
            resultLabel="année(s) scolaire(s)"
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
          <th>Code</th>
          <th>Période</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(schoolYear) => (
        <SchoolYearRow
          schoolYear={schoolYear}
          onView={onToggleRow ? () => onToggleRow(schoolYear.id) : undefined}
          onEdit={onEditSchoolYear}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(schoolYear) => <DetailsViewContent data={schoolYear} type="schoolYear" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(schoolYear) => (
        <SchoolYearCard
          schoolYear={schoolYear}
          onView={onToggleRow ? () => onToggleRow(schoolYear.id) : undefined}
          onEdit={onEditSchoolYear}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Calendar}
      emptyText="Aucune année scolaire trouvée"
      title="Années scolaires"
      isSection={isSection}
      expandedItem={expandedSchoolYear}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(sy) => <DetailsViewContent data={sy} type="schoolYear" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={schoolYearToDelete?.code}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
