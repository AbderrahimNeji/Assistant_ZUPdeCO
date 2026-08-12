import * as React from 'react';
import { Filter, Download, GraduationCap, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { LevelRow } from './LevelRow';
import { LevelCard } from './LevelCard';
import { LevelFiltersContent } from './LevelFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getLevels, deleteLevel, exportLevelsExcel } from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  DEFAULT_LEVEL_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type LevelFilters,
  type FilterGroupId,
} from './level-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { Level } from '@/types/level.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface LevelsDataTableProps {
  levels?: Level[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditLevel?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: LevelFilters;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  showCreateButton?: boolean;
  onCreateLevel?: () => void;
}

export const LevelsDataTable: React.FC<LevelsDataTableProps> = ({
  levels: externalLevels,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditLevel,
  enableFilters = true,
  defaultFilters = DEFAULT_LEVEL_FILTERS,
  isSection = false,
  pageActions,
  showCreateButton = false,
  onCreateLevel,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<LevelFilters, FilterGroupId>({
    tableName: 'levels',
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
    queryKey: ['levels', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getLevels({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        cycles: dt.filters.cycles.length > 0 ? dt.filters.cycles : undefined,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        search: dt.filters.searchTerm,
        minAge: dt.filters.minAge,
        maxAge: dt.filters.maxAge,
      }),
    enabled: !externalLevels,
  });

  const data = React.useMemo(
    () => externalLevels ?? (apiResponse?.data || []),
    [externalLevels, apiResponse?.data],
  );
  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalLevels ? data.length === 0 : !isLoading && totalItems === 0),
    [externalLevels, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucun niveau à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportLevelsExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedLevelData } = useQuery({
    queryKey: ['levels', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getLevel } = await import('@/services/academic.service');
      return await getLevel(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((l) => l.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.cycles.length > 0 ||
      dt.filters.statuses.length > 0 ||
      (!!dt.filters.searchTerm && dt.filters.searchTerm.length > 0) ||
      dt.filters.minAge !== undefined ||
      dt.filters.maxAge !== undefined,
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      dt.setDeleteId(null);
      toast.success('Niveau supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const levelToDelete = React.useMemo(
    () => data.find((l) => l.id === dt.deleteId),
    [data, dt.deleteId],
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

  const setSearchTerm = React.useCallback(
    (term: string) => {
      dt.setFilters((prev) => ({ ...prev, searchTerm: term || undefined }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setAgeRange = React.useCallback(
    (min: number | undefined, max: number | undefined) => {
      dt.setFilters((prev) => ({ ...prev, minAge: min, maxAge: max }));
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
          <LevelFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleCycle={toggleCycleFilter}
            onToggleStatus={toggleStatusFilter}
            onSetSearchTerm={setSearchTerm}
            onSetAgeRange={setAgeRange}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleCycleFilter,
      toggleStatusFilter,
      setSearchTerm,
      setAgeRange,
    ],
  );

  const expandedLevel = React.useMemo(
    () => data.find((l) => l.id === expandedRowId) ?? expandedLevelData ?? null,
    [expandedRowId, data, expandedLevelData],
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
      itemLabel="niveaux"
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
                  ? 'Aucun niveau à exporter avec les filtres actuels.'
                  : 'Exporter la liste des niveaux en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateLevel && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un niveau"
              onClick={() => {
                onCloseDetails?.();
                onCreateLevel();
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
            resultLabel="niveau(x)"
            onToggleConfigure={() => dt.setShowConfigure((v) => !v)}
            showConfigure={dt.showConfigure}
            configureContent={
              <div className="flex flex-wrap gap-2">
                {ALL_FILTER_GROUP_IDS.filter((id) => dt.allowedFilterIds.includes(id)).map((id) => {
                  const isOn = dt.filterVisibility[id];
                  return (
                    <Button
                      key={id}
                      variant="custom"
                      size="sm"
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg border transition-all',
                        isOn
                          ? 'bg-[var(--color-2-nuance-1)] border-[var(--color-2-nuance-1)] text-white'
                          : 'bg-transparent border-[var(--color-1-nuance-3)] text-muted-foreground hover:border-[var(--color-1-nuance-1)]',
                      )}
                      onClick={() => dt.handleToggleFilterVisibility(id)}
                      disabled={dt.isSavingFilterVisibility}
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
          <th>Libellé</th>
          <th>Cycle</th>
          <th>Tranche d'âge</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(level) => (
        <LevelRow
          level={level}
          onView={onToggleRow ? () => onToggleRow(level.id) : undefined}
          onEdit={onEditLevel}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(level) => <DetailsViewContent data={level} type="level" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(level) => (
        <LevelCard
          level={level}
          onView={onToggleRow ? () => onToggleRow(level.id) : undefined}
          onEdit={onEditLevel}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={GraduationCap}
      emptyText="Aucun niveau trouvé"
      title="Niveaux"
      isSection={isSection}
      expandedItem={expandedLevel}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(level) => <DetailsViewContent data={level} type="level" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={levelToDelete?.label}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
