import * as React from 'react';
import { Filter, Download, Calendar, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { ActivityRow } from './ActivityRow';
import { ActivityCard } from './ActivityCard';
import { ActivitiesFiltersContent } from './ActivitiesFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getActivities, deleteActivity, exportActivitiesExcel } from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ACTIVITY_FILTERS,
  ALL_ACTIVITY_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS_ACTIVITIES,
  type ActivityFilters,
  type ActivityFilterGroupId,
} from './activity-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { Activity } from '@/types/activity.types';

interface ActivitiesDataTableProps {
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  activities?: Activity[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditActivity?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: ActivityFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
}

export const ActivitiesDataTable: React.FC<ActivitiesDataTableProps> = ({
  activities: externalActivities,
  showCreateButton = false,
  onCreateClick,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditActivity,
  enableFilters = true,
  defaultFilters = DEFAULT_ACTIVITY_FILTERS,
  layoutWidth: layoutWidthProp = 'full',
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<ActivityFilters, ActivityFilterGroupId>({
    tableName: 'activities',
    defaultFilters,
    allFilterGroupIds: ALL_ACTIVITY_FILTER_GROUP_IDS,
    layoutWidth: layoutWidthProp,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['activities', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getActivities({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        activityTypeIds:
          dt.filters.activityTypeIds.length > 0 ? dt.filters.activityTypeIds : undefined,
        hasChat: dt.filters.hasChat !== null ? dt.filters.hasChat : undefined,
        hasBot: dt.filters.hasBot !== null ? dt.filters.hasBot : undefined,
        hasLink: dt.filters.hasLink !== null ? dt.filters.hasLink : undefined,
        canHaveCr: dt.filters.canHaveCr !== null ? dt.filters.canHaveCr : undefined,
        search: dt.filters.searchQuery,
      }),
    enabled: !externalActivities,
    staleTime: 5 * 60 * 1000,
  });

  const data = React.useMemo(
    () => externalActivities ?? (apiResponse?.data || []),
    [externalActivities, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalActivities ? data.length === 0 : !isLoading && totalItems === 0),
    [externalActivities, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucune activité à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportActivitiesExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedActivityData } = useQuery({
    queryKey: ['activities', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getActivity } = await import('@/services/academic.service');
      return await getActivity(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((a) => a.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.activityTypeIds.length > 0 ||
      dt.filters.hasChat !== null ||
      dt.filters.hasBot !== null ||
      dt.filters.hasLink !== null ||
      dt.filters.canHaveCr !== null ||
      !!dt.filters.searchQuery?.trim(),
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      dt.setDeleteId(null);
      toast.success('Activité supprimée avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const activityToDelete = React.useMemo(
    () => data.find((a) => a.id === dt.deleteId),
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

  const toggleActivityTypeFilter = React.useCallback(
    (activityTypeId: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        activityTypeIds: prev.activityTypeIds.includes(activityTypeId)
          ? prev.activityTypeIds.filter((id) => id !== activityTypeId)
          : [...prev.activityTypeIds, activityTypeId],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleFeatureFilter = React.useCallback(
    (feature: 'chat' | 'bot' | 'link' | 'cr') => {
      dt.setFilters((prev) => {
        const key =
          feature === 'chat'
            ? 'hasChat'
            : feature === 'bot'
              ? 'hasBot'
              : feature === 'link'
                ? 'hasLink'
                : 'canHaveCr';
        const currentValue = prev[key];
        return {
          ...prev,
          [key]: currentValue === null ? true : currentValue === true ? false : null,
        };
      });
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
          <ActivitiesFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onToggleActivityType={toggleActivityTypeFilter}
            onToggleFeature={toggleFeatureFilter}
            onSetSearchQuery={setSearchQuery}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleStatusFilter,
      toggleActivityTypeFilter,
      toggleFeatureFilter,
      setSearchQuery,
    ],
  );

  const expandedActivity = React.useMemo(
    () => data.find((a) => a.id === expandedRowId) ?? expandedActivityData ?? null,
    [expandedRowId, data, expandedActivityData],
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
      itemLabel="activités"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={11}
      toolbarActions={
        <>
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => {
                const next = !dt.showFilters;
                if (!next) dt.setShowConfigure(false);
                dt.setShowFilters(next);
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
                  ? 'Aucune activité à exporter avec les filtres actuels.'
                  : 'Exporter la liste des activités en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateClick && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer une activité"
              onClick={() => {
                onCloseDetails?.();
                onCreateClick();
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
            resultLabel="activité(s)"
            onToggleConfigure={
              dt.allowedFilterIds.length > 0 ? () => dt.setShowConfigure((v) => !v) : undefined
            }
            showConfigure={dt.showConfigure}
            configureContent={
              <div className="flex flex-wrap gap-3">
                {ALL_ACTIVITY_FILTER_GROUP_IDS.filter((id) => dt.allowedFilterIds.includes(id)).map(
                  (id) => {
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
                        {FILTER_GROUP_LABELS_ACTIVITIES[id]}
                      </Button>
                    );
                  },
                )}
              </div>
            }
          />
        ) : undefined
      }
      renderTableHead={() => (
        <tr>
          <th>Code</th>
          <th>Libellé</th>
          <th>Type</th>
          <th>Description</th>
          <th>Statut</th>
          <th className="text-center whitespace-nowrap">Max tuteurs</th>
          <th className="text-center whitespace-nowrap">Max élèves</th>
          <th className="text-center whitespace-nowrap">Max VSC</th>
          <th className="text-center whitespace-nowrap">Max élèves par tuteur</th>
          <th>Options</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(activity) => (
        <ActivityRow
          activity={activity}
          onView={onToggleRow ? () => onToggleRow(activity.id) : undefined}
          onEdit={onEditActivity}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(activity) => <DetailsViewContent data={activity} type="activity" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(activity) => (
        <ActivityCard
          activity={activity}
          onView={onToggleRow ? () => onToggleRow(activity.id) : undefined}
          onEdit={onEditActivity}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Calendar}
      emptyText="Aucune activité trouvée"
      title="Activités"
      isSection={isSection}
      expandedItem={expandedActivity}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(activity) => <DetailsViewContent data={activity} type="activity" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={activityToDelete?.label}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
