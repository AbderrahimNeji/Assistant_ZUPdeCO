import * as React from 'react';
import { Filter, Tag, Plus, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { ActivityTypeRow } from './ActivityTypeRow';
import { ActivityTypeCard } from './ActivityTypeCard';
import { ActivityTypeFiltersContent } from './ActivityTypeFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import {
  getActivityTypes,
  deleteActivityType,
  exportActivityTypesExcel,
} from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  ALL_FILTER_GROUP_IDS,
  DEFAULT_ACTIVITY_TYPE_FILTERS,
  FILTER_GROUP_LABELS,
  type ActivityTypeFilters,
  type FilterGroupId,
} from './activity-type-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { ActivityType } from '@/types/activity.types';

interface ActivityTypesDataTableProps {
  activityTypes?: ActivityType[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  showCreateButton?: boolean;
  onCreateActivityType?: () => void;
  onEditActivityType?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: ActivityTypeFilters;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
}

export const ActivityTypesDataTable: React.FC<ActivityTypesDataTableProps> = ({
  activityTypes: externalActivityTypes,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  showCreateButton = false,
  onCreateActivityType,
  onEditActivityType,
  enableFilters = true,
  defaultFilters = DEFAULT_ACTIVITY_TYPE_FILTERS,
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<ActivityTypeFilters, FilterGroupId>({
    tableName: 'activityTypes',
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
    queryKey: ['activityTypes', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getActivityTypes({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        search: dt.filters.searchQuery,
      }),
    enabled: !externalActivityTypes,
    staleTime: 5 * 60 * 1000,
  });

  const data = React.useMemo(
    () => externalActivityTypes ?? (apiResponse?.data || []),
    [externalActivityTypes, apiResponse?.data],
  );
  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalActivityTypes ? data.length === 0 : !isLoading && totalItems === 0),
    [externalActivityTypes, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning("Aucun type d'activité à exporter avec les filtres actuels.");
      return;
    }
    setIsExporting(true);
    try {
      await exportActivityTypesExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedActivityTypeData } = useQuery({
    queryKey: ['activity-types', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getActivityType } = await import('@/services/academic.service');
      return await getActivityType(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((at) => at.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () => dt.filters.statuses.length > 0 || !!dt.filters.searchQuery?.trim(),
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteActivityType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityTypes'] });
      dt.setDeleteId(null);
      toast.success("Type d'activité supprimé avec succès !");
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const activityTypeToDelete = React.useMemo(
    () => data.find((at) => at.id === dt.deleteId),
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

  const setSearchQuery = React.useCallback(
    (query: string) => {
      dt.setFilters((prev) => ({ ...prev, searchQuery: query }));
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
          <ActivityTypeFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onSetSearchQuery={setSearchQuery}
          />
        ),
      },
    ],
    [dt.filters, dt.allowedFilterIds, dt.visibleFilterIds, toggleStatusFilter, setSearchQuery],
  );

  const expandedActivityType = React.useMemo(
    () => data.find((at) => at.id === expandedRowId) ?? expandedActivityTypeData ?? null,
    [expandedRowId, data, expandedActivityTypeData],
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
      itemLabel="types d'activités"
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
                  ? "Aucun type d'activité à exporter avec les filtres actuels."
                  : "Exporter la liste des types d'activité en Excel"
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateActivityType && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un type d'activité"
              onClick={onCreateActivityType}
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
            resultLabel="type(s) d'activité(s)"
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
          <th>Libellé</th>
          <th>Description</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(activityType) => (
        <ActivityTypeRow
          activityType={activityType}
          onView={onToggleRow ? () => onToggleRow(activityType.id) : undefined}
          onEdit={onEditActivityType}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(activityType) => (
        <DetailsViewContent data={activityType} type="activityType" />
      )}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(activityType) => (
        <ActivityTypeCard
          activityType={activityType}
          onView={onToggleRow ? () => onToggleRow(activityType.id) : undefined}
          onEdit={onEditActivityType}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Tag}
      emptyText="Aucun type d'activité trouvé"
      title="Types d'activité"
      isSection={isSection}
      expandedItem={expandedActivityType}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(at) => <DetailsViewContent data={at} type="activityType" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={activityTypeToDelete?.label}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
