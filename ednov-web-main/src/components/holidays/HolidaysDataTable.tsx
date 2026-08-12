import * as React from 'react';
import { Filter, Calendar, Plus, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { HolidayRow } from './HolidayRow';
import { HolidayCard } from './HolidayCard';
import { HolidayFiltersContent } from './HolidayFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getHolidays, deleteHoliday, exportHolidaysExcel } from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  DEFAULT_HOLIDAY_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type HolidayFilters,
  type FilterGroupId,
} from './holiday-configs';

/** Maps UI filters to API dateFrom/dateTo (presets: current week / month / year). */
function resolveHolidayDateRange(filters: HolidayFilters): { dateFrom?: Date; dateTo?: Date } {
  if (filters.customDateFrom != null || filters.customDateTo != null) {
    return {
      dateFrom: filters.customDateFrom,
      dateTo: filters.customDateTo,
    };
  }
  const now = new Date();
  switch (filters.dateRange) {
    case 'week': {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + mondayOffset,
        0,
        0,
        0,
        0,
      );
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { dateFrom: monday, dateTo: sunday };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { dateFrom: start, dateTo: end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { dateFrom: start, dateTo: end };
    }
    case 'all':
    default:
      return {};
  }
}
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { Holiday } from '@/types/holiday.types';

interface HolidaysDataTableProps {
  holidays?: Holiday[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditHoliday?: (id: string) => void;
  showCreateButton?: boolean;
  onCreateHoliday?: () => void;
  enableFilters?: boolean;
  defaultFilters?: HolidayFilters;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
}

export const HolidaysDataTable: React.FC<HolidaysDataTableProps> = ({
  holidays: externalHolidays,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditHoliday,
  showCreateButton = false,
  onCreateHoliday,
  enableFilters = true,
  defaultFilters = DEFAULT_HOLIDAY_FILTERS,
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<HolidayFilters, FilterGroupId>({
    tableName: 'holidays',
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
    queryKey: ['holidays', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () => {
      const { dateFrom, dateTo } = resolveHolidayDateRange(dt.filters);
      return getHolidays({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        types: dt.filters.types.length > 0 ? dt.filters.types : undefined,
        dateFrom,
        dateTo,
      });
    },
    enabled: !externalHolidays,
  });

  const data = React.useMemo(
    () => externalHolidays ?? (apiResponse?.data || []),
    [externalHolidays, apiResponse?.data],
  );
  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalHolidays ? data.length === 0 : !isLoading && totalItems === 0),
    [externalHolidays, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucun congé / jour férié à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportHolidaysExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedHolidayData } = useQuery({
    queryKey: ['holidays', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getHoliday } = await import('@/services/academic.service');
      return await getHoliday(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((h) => h.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.types.length > 0 ||
      dt.filters.dateRange !== 'all' ||
      dt.filters.customDateFrom !== undefined ||
      dt.filters.customDateTo !== undefined,
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      dt.setDeleteId(null);
      toast.success('Vacance/Férié supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const holidayToDelete = React.useMemo(
    () => data.find((h) => h.id === dt.deleteId),
    [data, dt.deleteId],
  );

  const toggleTypeFilter = React.useCallback(
    (type: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        types: prev.types.includes(type)
          ? prev.types.filter((t) => t !== type)
          : [...prev.types, type],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setDateRange = React.useCallback(
    (range: HolidayFilters['dateRange']) => {
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

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <HolidayFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleType={toggleTypeFilter}
            onSetDateRange={setDateRange}
            onSetCustomDateRange={setCustomDateRange}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleTypeFilter,
      setDateRange,
      setCustomDateRange,
    ],
  );

  const expandedHoliday = React.useMemo(
    () => data.find((h) => h.id === expandedRowId) ?? expandedHolidayData ?? null,
    [expandedRowId, data, expandedHolidayData],
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
      itemLabel="vacances/fériés"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={8}
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
                  ? 'Aucun congé / jour férié à exporter avec les filtres actuels.'
                  : 'Exporter la liste des congés / jours fériés en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateHoliday && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer une vacance"
              onClick={onCreateHoliday}
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
            resultLabel="vacance(s) / férié(s)"
            onToggleConfigure={() => dt.setShowConfigure((prev) => !prev)}
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
          <th>Nom</th>
          <th>Type</th>
          <th>Zone</th>
          <th>Date de début</th>
          <th>Date de fin</th>
          <th>Options</th>
          <th>Description</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(holiday) => (
        <HolidayRow
          holiday={holiday}
          onView={onToggleRow ? () => onToggleRow(holiday.id) : undefined}
          onEdit={onEditHoliday}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(holiday) => <DetailsViewContent data={holiday} type="holiday" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(holiday) => (
        <HolidayCard
          holiday={holiday}
          onView={onToggleRow ? () => onToggleRow(holiday.id) : undefined}
          onEdit={onEditHoliday}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Calendar}
      emptyText="Aucune vacance ou jour férié trouvé"
      title="Vacances"
      isSection={isSection}
      expandedItem={expandedHoliday}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(holiday) => <DetailsViewContent data={holiday} type="holiday" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={holidayToDelete?.name}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
