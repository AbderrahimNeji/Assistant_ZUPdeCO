import * as React from 'react';
import { Filter, User as UserIcon, Download, Plus } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { AdminRow } from './AdminRow';
import { AdminCard } from './AdminCard';
import { AdminFiltersContent } from './AdminFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { useDataTable } from '@/hooks/useDataTable';
import { getAdmins, exportAdminsExcel } from '@/services/users.service';
import { Spinner } from '@/components/ui/spinner';
import { deleteAdmin } from '@/services/admins.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ADMIN_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type AdminFilters,
  type FilterGroupId,
} from './admin-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { Admin, AdminRole } from '@/types/admin.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface AdminsDataTableProps {
  admins?: Admin[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditAdmin?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: AdminFilters;
  enabledRoles?: AdminRole[];
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  showCreateButton?: boolean;
  onCreateAdmin?: () => void;
}

export const AdminsDataTable: React.FC<AdminsDataTableProps> = ({
  admins: externalAdmins,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditAdmin,
  enableFilters = true,
  defaultFilters = DEFAULT_ADMIN_FILTERS,
  enabledRoles = ['admin', 'coordinator', 'manager'],
  layoutWidth: layoutWidthProp = 'full',
  isSection = false,
  pageActions,
  showCreateButton = false,
  onCreateAdmin,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<AdminFilters, FilterGroupId>({
    tableName: 'admins',
    defaultFilters,
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
    layoutWidth: layoutWidthProp,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  React.useEffect(() => {
    dt.setCurrentPage(1);
  }, [enabledRoles]);

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['users', 'admin', dt.currentPage, dt.itemsPerPage, dt.filters, enabledRoles],
    queryFn: async () => {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (dt.filters.customDateFrom || dt.filters.customDateTo) {
        dateFrom = dt.filters.customDateFrom;
        dateTo = dt.filters.customDateTo;
      } else if (dt.filters.dateRange && dt.filters.dateRange !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (dt.filters.dateRange) {
          case 'week':
            dateFrom = new Date(startOfToday);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateTo = new Date();
            break;
          case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            dateTo = new Date();
            break;
          case 'year':
            dateFrom = new Date(now.getFullYear(), 0, 1);
            dateTo = new Date();
            break;
        }
      }

      return await getAdmins({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        establishmentId: dt.filters.establishmentId,
        roleCodes: enabledRoles && enabledRoles.length > 0 ? enabledRoles : undefined,
        dateFrom,
        dateTo,
      });
    },
    enabled: !externalAdmins,
    staleTime: 5 * 60 * 1000,
  });

  const data = React.useMemo(
    () => externalAdmins ?? (apiResponse?.data || []),
    [externalAdmins, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalAdmins ? data.length === 0 : !isLoading && totalItems === 0),
    [externalAdmins, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucun administrateur à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;
      if (dt.filters.customDateFrom || dt.filters.customDateTo) {
        dateFrom = dt.filters.customDateFrom;
        dateTo = dt.filters.customDateTo;
      } else if (dt.filters.dateRange && dt.filters.dateRange !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (dt.filters.dateRange) {
          case 'week':
            dateFrom = new Date(startOfToday);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateTo = new Date();
            break;
          case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            dateTo = new Date();
            break;
          case 'year':
            dateFrom = new Date(now.getFullYear(), 0, 1);
            dateTo = new Date();
            break;
        }
      }
      await exportAdminsExcel({
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        roleCodes: enabledRoles && enabledRoles.length > 0 ? enabledRoles : undefined,
        dateFrom,
        dateTo,
      });
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [dt.filters, enabledRoles, isEmptyForExport]);

  const { data: expandedAdminData } = useQuery({
    queryKey: ['admins', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getAdmin } = await import('@/services/users.service');
      return await getAdmin(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((a) => a.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.establishmentId !== undefined ||
      dt.filters.dateRange !== 'all' ||
      dt.filters.customDateFrom !== undefined ||
      dt.filters.customDateTo !== undefined,
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      dt.setDeleteId(null);
      toast.success('Administrateur supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const adminToDelete = React.useMemo(
    () => data.find((admin) => admin.id === dt.deleteId),
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

  const setEstablishment = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, establishmentId: id }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setDateRange = React.useCallback(
    (range: AdminFilters['dateRange']) => {
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
        id: 'filters' as const,
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <AdminFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onSetEstablishment={setEstablishment}
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
      toggleStatusFilter,
      setEstablishment,
      setDateRange,
      setCustomDateRange,
    ],
  );

  const expandedAdmin = React.useMemo(
    () => data.find((a) => a.id === expandedRowId) ?? expandedAdminData ?? null,
    [expandedRowId, data, expandedAdminData],
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
      itemLabel="administrateurs"
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
                  ? 'Aucun administrateur à exporter avec les filtres actuels.'
                  : 'Exporter la liste des administrateurs en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateAdmin && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un collaborateur"
              onClick={() => {
                onCloseDetails?.();
                onCreateAdmin();
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
            resultLabel="administrateur(s)"
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
          <th>Nom</th>
          <th>Email</th>
          <th>Téléphone</th>
          <th>Rôles</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(admin) => (
        <AdminRow
          admin={admin}
          interfaceElements={dt.interfaceElements}
          onView={onToggleRow ? () => onToggleRow(admin.id) : undefined}
          onEdit={onEditAdmin}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(admin) => <DetailsViewContent data={admin} type="admin" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(admin) => (
        <AdminCard
          admin={admin}
          interfaceElements={dt.interfaceElements}
          onView={onToggleRow ? () => onToggleRow(admin.id) : undefined}
          onEdit={onEditAdmin}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={UserIcon}
      emptyText="Aucun administrateur trouvé"
      title="Administrateurs"
      isSection={isSection}
      expandedItem={expandedAdmin}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(admin) => <DetailsViewContent data={admin} type="admin" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={adminToDelete ? `${adminToDelete.firstName} ${adminToDelete.lastName}` : ''}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
