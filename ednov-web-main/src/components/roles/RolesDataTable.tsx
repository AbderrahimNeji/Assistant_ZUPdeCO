import * as React from 'react';
import { Download, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { RoleRow } from './RoleRow';
import { RoleCard } from './RoleCard';
import { RoleFiltersContent } from './RoleFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getRoles, getRole, deleteRole, exportRolesExcel } from '@/services/roles.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ROLE_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type RoleFilters,
  type FilterGroupId,
} from './role-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { Role } from '@/types/role.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface RolesDataTableProps {
  roles?: Role[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditRole?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: RoleFilters;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  showCreateButton?: boolean;
  onCreateRole?: () => void;
}

export const RolesDataTable: React.FC<RolesDataTableProps> = ({
  roles: externalRoles,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditRole,
  enableFilters = true,
  defaultFilters = DEFAULT_ROLE_FILTERS,
  isSection = false,
  pageActions,
  showCreateButton = false,
  onCreateRole,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<RoleFilters, FilterGroupId>({
    tableName: 'roles',
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
    queryKey: ['roles', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getRoles({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        roleGroups: dt.filters.roleGroups.length > 0 ? dt.filters.roleGroups : undefined,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        modes: dt.filters.modes.length > 0 ? dt.filters.modes : undefined,
        search: dt.filters.searchTerm,
        minHierarchyLevel: dt.filters.minHierarchyLevel,
        maxHierarchyLevel: dt.filters.maxHierarchyLevel,
      }),
    enabled: !externalRoles,
  });

  const data = React.useMemo(
    () => externalRoles ?? (apiResponse?.data || []),
    [externalRoles, apiResponse?.data],
  );

  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const roleGroupsData = React.useMemo(() => {
    const seen = new Map<
      string,
      { code: string; label: string; icon: string | null; color: string | null }
    >();
    data.forEach((r) => {
      if (r.roleGroup && !seen.has(r.roleGroup)) {
        seen.set(r.roleGroup, {
          code: r.roleGroup,
          label: r.roleGroupLabel ?? r.roleGroup,
          icon: r.roleGroupIcon ?? null,
          color: r.roleGroupColor ?? null,
        });
      }
    });
    return Array.from(seen.values());
  }, [data]);

  const [isExporting, setIsExporting] = React.useState(false);

  const isEmptyForExport = React.useMemo(
    () => (externalRoles ? data.length === 0 : !isLoading && totalItems === 0),
    [externalRoles, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.info('Aucune donnée à exporter.');
      return;
    }

    setIsExporting(true);
    try {
      await exportRolesExcel();
      toast.success('Export Excel réussi !');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error("Échec de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedRoleData } = useQuery({
    queryKey: ['role', dt.expandedRowId],
    queryFn: async () => {
      if (!dt.expandedRowId) return null;
      return await getRole(dt.expandedRowId);
    },
    enabled: !!dt.expandedRowId && !data.some((r) => r.id === dt.expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.modes.length > 0 ||
      dt.filters.roleGroups.length > 0 ||
      !!dt.filters.searchTerm ||
      dt.filters.minHierarchyLevel !== undefined ||
      dt.filters.maxHierarchyLevel !== undefined,
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle supprimé avec succès');
      dt.setDeleteId(null);
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast.error(error?.message || 'Échec de la suppression du rôle');
    },
  });

  const roleToDelete = React.useMemo(
    () => data.find((r) => r.id === dt.deleteId) ?? null,
    [data, dt.deleteId],
  );

  const toggleRoleGroupFilter = React.useCallback(
    (groupCode: string) => {
      const current = dt.filters.roleGroups || [];
      const updated = current.includes(groupCode)
        ? current.filter((c) => c !== groupCode)
        : [...current, groupCode];
      dt.setFilters({ ...dt.filters, roleGroups: updated });
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleStatusFilter = React.useCallback(
    (status: string) => {
      const current = dt.filters.statuses || [];
      const updated = current.includes(status as any)
        ? current.filter((s) => s !== status)
        : [...current, status as any];
      dt.setFilters({ ...dt.filters, statuses: updated });
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleModeFilter = React.useCallback(
    (mode: string) => {
      const current = dt.filters.modes || [];
      const updated = current.includes(mode as any)
        ? current.filter((m) => m !== mode)
        : [...current, mode as any];
      dt.setFilters({ ...dt.filters, modes: updated });
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setSearchTerm = React.useCallback(
    (searchTerm: string) => {
      dt.setFilters({ ...dt.filters, searchTerm });
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setHierarchyRange = React.useCallback(
    (minHierarchyLevel: number | undefined, maxHierarchyLevel: number | undefined) => {
      dt.setFilters({ ...dt.filters, minHierarchyLevel, maxHierarchyLevel });
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
          <RoleFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            roleGroups={roleGroupsData}
            onToggleRoleGroup={toggleRoleGroupFilter}
            onToggleStatus={toggleStatusFilter}
            onToggleMode={toggleModeFilter}
            onSetSearchTerm={setSearchTerm}
            onSetHierarchyRange={setHierarchyRange}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      roleGroupsData,
      toggleRoleGroupFilter,
      toggleStatusFilter,
      toggleModeFilter,
      setSearchTerm,
      setHierarchyRange,
    ],
  );

  const expandedRole = React.useMemo(
    () => data.find((r) => r.id === dt.expandedRowId) ?? expandedRoleData ?? null,
    [dt.expandedRowId, data, expandedRoleData],
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
      itemLabel="rôles"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={7}
      toolbarActions={
        <>
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
          {showExport && (
            <Button
              preset="toolbar-export"
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucun rôle à exporter avec les filtres actuels.'
                  : 'Exporter la liste des rôles en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateRole && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un rôle"
              onClick={() => {
                onCloseDetails?.();
                onCreateRole();
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
            resultLabel="rôle(s)"
            onToggleConfigure={() => dt.setShowConfigure((v) => !v)}
            showConfigure={dt.showConfigure}
            configureContent={
              <div className="flex flex-wrap gap-2">
                {ALL_FILTER_GROUP_IDS.map((id) => {
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
          <th>Rôle</th>
          <th>Groupe</th>
          <th>Hiérarchie</th>
          <th>Mode</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(role) => (
        <RoleRow
          role={role}
          onView={onToggleRow ? () => onToggleRow(role.id) : undefined}
          onEdit={onEditRole}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(role) => <DetailsViewContent data={role} type="role" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(role) => (
        <RoleCard
          role={role}
          onView={onToggleRow ? () => onToggleRow(role.id) : undefined}
          onEdit={onEditRole}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Shield}
      emptyText="Aucun rôle trouvé"
      title="Rôles"
      isSection={isSection}
      expandedItem={expandedRole}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(role) => <DetailsViewContent data={role} type="role" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={roleToDelete?.label}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
