import * as React from 'react';
import { Filter, FileText, Download, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { ProgramRow } from './ProgramRow';
import { ProgramCard } from './ProgramCard';
import { ProgramFiltersContent } from './ProgramFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getPrograms, deleteProgram, exportProgramsExcel } from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  ALL_FILTER_GROUP_IDS,
  DEFAULT_PROGRAM_FILTERS,
  FILTER_GROUP_LABELS,
  type FilterGroupId,
  type ProgramFilters,
} from './program-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { Program } from '@/types/program.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface ProgramsDataTableProps {
  programs?: Program[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditProgram?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: ProgramFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  showCreateButton?: boolean;
  onCreateProgram?: () => void;
}

export const ProgramsDataTable: React.FC<ProgramsDataTableProps> = ({
  programs: externalPrograms,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditProgram,
  enableFilters = true,
  showCreateButton = false,
  onCreateProgram,
  defaultFilters = DEFAULT_PROGRAM_FILTERS,
  layoutWidth = 'full',
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<ProgramFilters, FilterGroupId>({
    tableName: 'programs',
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
    queryKey: ['programs', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getPrograms({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        cycles: dt.filters.cycles.length > 0 ? dt.filters.cycles : undefined,
        periodes: dt.filters.periodes.length > 0 ? dt.filters.periodes : undefined,
        isActive: dt.filters.isActive ?? undefined,
      }),
    enabled: !externalPrograms,
  });

  const data = React.useMemo(
    () => externalPrograms ?? (apiResponse?.data || []),
    [externalPrograms, apiResponse?.data],
  );
  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalPrograms ? data.length === 0 : !isLoading && totalItems === 0),
    [externalPrograms, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucun programme à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportProgramsExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedProgramData } = useQuery({
    queryKey: ['programs', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getProgram } = await import('@/services/academic.service');
      return await getProgram(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((p) => p.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.cycles.length > 0 ||
      dt.filters.periodes.length > 0 ||
      (dt.filters.isActive !== undefined && dt.filters.isActive !== null),
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      dt.setDeleteId(null);
      toast.success('Programme supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du programme');
    },
  });

  const programToDelete = React.useMemo(
    () => data.find((p) => p.id === dt.deleteId),
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

  const toggleCycleFilter = React.useCallback(
    (cycle: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        cycles: prev.cycles.includes(cycle)
          ? prev.cycles.filter((c) => c !== cycle)
          : [...prev.cycles, cycle],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const togglePeriodeFilter = React.useCallback(
    (periode: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        periodes: prev.periodes.includes(periode)
          ? prev.periodes.filter((p) => p !== periode)
          : [...prev.periodes, periode],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleActiveFilter = React.useCallback(() => {
    dt.setFilters((prev) => {
      if (prev.isActive === null) return { ...prev, isActive: true };
      if (prev.isActive === true) return { ...prev, isActive: false };
      return { ...prev, isActive: null };
    });
    dt.setCurrentPage(1);
  }, [dt]);

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <ProgramFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onToggleCycle={toggleCycleFilter}
            onTogglePeriode={togglePeriodeFilter}
            onToggleActive={toggleActiveFilter}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleStatusFilter,
      toggleCycleFilter,
      togglePeriodeFilter,
      toggleActiveFilter,
    ],
  );

  const expandedProgram = React.useMemo(
    () => data.find((p) => p.id === expandedRowId) ?? expandedProgramData ?? null,
    [expandedRowId, data, expandedProgramData],
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
      itemLabel="programmes"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={5}
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
          {showExport && (
            <Button
              preset="toolbar-export"
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucun programme à exporter avec les filtres actuels.'
                  : 'Exporter la liste des programmes en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateProgram && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un programme"
              onClick={() => {
                onCloseDetails?.();
                onCreateProgram();
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
            resultLabel="programme(s)"
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
          <th>Nom</th>
          <th>Période</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(program) => (
        <ProgramRow
          program={program}
          onView={onToggleRow ? () => onToggleRow(program.id) : undefined}
          onEdit={onEditProgram}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(program) => <DetailsViewContent data={program} type="program" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(program) => (
        <ProgramCard
          program={program}
          onView={onToggleRow ? () => onToggleRow(program.id) : undefined}
          onEdit={onEditProgram}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={FileText}
      emptyText="Aucun programme trouvé"
      title="Programmes"
      isSection={isSection}
      expandedItem={expandedProgram}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(program) => <DetailsViewContent data={program} type="program" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={programToDelete?.name}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
