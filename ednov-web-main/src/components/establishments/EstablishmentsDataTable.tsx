import * as React from 'react';
import { Filter, Building2, Plus, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Spinner } from '@/components/ui/spinner';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { EstablishmentRow } from './EstablishmentRow';
import { EstablishmentCard } from './EstablishmentCard';
import { EstablishmentFiltersContent } from './EstablishmentFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import {
  getEstablishments,
  deleteEstablishment,
  exportEstablishmentsExcel,
} from '@/services/establishments.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ESTABLISHMENT_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type EstablishmentFilters,
  type FilterGroupId,
} from './establishment-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type {
  Establishment,
  EstablishmentCategory,
  EstablishmentPriorityNetwork,
  EstablishmentType,
  EstablishmentStatus,
} from '@/types/establishment.types';

interface EstablishmentsDataTableProps {
  establishments?: Establishment[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  enableFilters?: boolean;
  defaultFilters?: EstablishmentFilters;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  onEditEstablishment?: (establishment: Establishment) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  isSection?: boolean;
  /** Show « Nbre de VSC par établissement » column (defaults to isSection). */
  showVscCount?: boolean;
  pageActions?: {
    canEditRow?: boolean;
    canDeleteRow?: boolean;
    canExportCsv?: boolean;
  };
}

export const EstablishmentsDataTable: React.FC<EstablishmentsDataTableProps> = ({
  establishments: externalEstablishments,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth = 'full',
  enableFilters = true,
  defaultFilters = DEFAULT_ESTABLISHMENT_FILTERS,
  showCreateButton = false,
  onCreateClick,
  onEditEstablishment,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  isSection = false,
  showVscCount: showVscCountProp,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showVscCount = showVscCountProp ?? isSection;
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<EstablishmentFilters, FilterGroupId>({
    tableName: 'establishments',
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
    queryKey: ['establishments', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getEstablishments({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        types: dt.filters.types.length > 0 ? dt.filters.types : undefined,
        categories:
          dt.filters.categories && dt.filters.categories.length > 0
            ? dt.filters.categories
            : undefined,
        priorityNetworks:
          dt.filters.priorityNetworks && dt.filters.priorityNetworks.length > 0
            ? dt.filters.priorityNetworks
            : undefined,
        isQpv:
          dt.filters.isQpv !== undefined && dt.filters.isQpv !== null
            ? dt.filters.isQpv
            : undefined,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        cities: dt.filters.cities && dt.filters.cities.length > 0 ? dt.filters.cities : undefined,
        departments:
          dt.filters.departments && dt.filters.departments.length > 0
            ? dt.filters.departments
            : undefined,
        search: dt.filters.searchQuery,
        specialtyIds:
          dt.filters.specialtyIds && dt.filters.specialtyIds.length > 0
            ? dt.filters.specialtyIds
            : undefined,
      }),
    enabled: !externalEstablishments,
  });

  const establishments = React.useMemo(
    () => externalEstablishments ?? (apiResponse?.data || []),
    [externalEstablishments, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || establishments.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalEstablishments ? establishments.length === 0 : !isLoading && totalItems === 0),
    [externalEstablishments, establishments.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucun établissement à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportEstablishmentsExcel({
        types: dt.filters.types.length > 0 ? dt.filters.types : undefined,
        categories: dt.filters.categories?.length > 0 ? dt.filters.categories : undefined,
        priorityNetworks:
          dt.filters.priorityNetworks?.length > 0 ? dt.filters.priorityNetworks : undefined,
        isQpv:
          dt.filters.isQpv !== undefined && dt.filters.isQpv !== null
            ? dt.filters.isQpv
            : undefined,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        cities: dt.filters.cities?.length > 0 ? dt.filters.cities : undefined,
        departments: dt.filters.departments?.length > 0 ? dt.filters.departments : undefined,
        search: dt.filters.searchQuery,
      });
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [dt.filters, isEmptyForExport]);

  // Requête séparée si l'établissement expanded n'est pas dans la page courante
  const { data: expandedEstablishmentData } = useQuery({
    queryKey: ['establishments', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getEstablishment } = await import('@/services/establishments.service');
      return await getEstablishment(expandedRowId);
    },
    enabled: !!expandedRowId && !establishments.some((e) => e.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.types.length > 0 ||
      (dt.filters.categories && dt.filters.categories.length > 0) ||
      (dt.filters.priorityNetworks && dt.filters.priorityNetworks.length > 0) ||
      (dt.filters.isQpv !== undefined && dt.filters.isQpv !== null) ||
      dt.filters.statuses.length > 0 ||
      (dt.filters.cities && dt.filters.cities.length > 0) ||
      (dt.filters.departments && dt.filters.departments.length > 0) ||
      (dt.filters.calendarTypes && dt.filters.calendarTypes.length > 0) ||
      !!dt.filters.searchQuery?.trim() ||
      dt.filters.createdFrom !== undefined ||
      dt.filters.createdTo !== undefined ||
      !!dt.filters.managedById ||
      (dt.filters.specialtyIds && dt.filters.specialtyIds.length > 0),
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteEstablishment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishments'] });
      dt.setDeleteId(null);
      toast.success('Établissement supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const establishmentToDelete = React.useMemo(
    () => establishments.find((e) => e.id === dt.deleteId),
    [establishments, dt.deleteId],
  );

  const toggleTypeFilter = React.useCallback(
    (type: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        types: prev.types.includes(type as EstablishmentType)
          ? prev.types.filter((t) => t !== type)
          : [...prev.types, type as EstablishmentType],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleCategoryFilter = React.useCallback(
    (category: string) => {
      dt.setFilters((prev) => {
        const cats = prev.categories ?? [];
        return {
          ...prev,
          categories: cats.includes(category as EstablishmentCategory)
            ? cats.filter((c) => c !== category)
            : [...cats, category as EstablishmentCategory],
        };
      });
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const togglePriorityNetworkFilter = React.useCallback(
    (network: string) => {
      dt.setFilters((prev) => {
        const nets = prev.priorityNetworks ?? [];
        return {
          ...prev,
          priorityNetworks: nets.includes(network as EstablishmentPriorityNetwork)
            ? nets.filter((n) => n !== network)
            : [...nets, network as EstablishmentPriorityNetwork],
        };
      });
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleStatusFilter = React.useCallback(
    (status: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        statuses: prev.statuses.includes(status as EstablishmentStatus)
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status as EstablishmentStatus],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCity = React.useCallback(
    (city: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, cities: city ? [city] : [] }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setDepartment = React.useCallback(
    (dept: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, departments: dept ? [dept] : [] }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCalendarType = React.useCallback(
    (type: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, calendarTypes: type ? [type] : [] }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setQpv = React.useCallback(
    (val: boolean | null) => {
      dt.setFilters((prev) => ({ ...prev, isQpv: val ?? undefined }));
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

  const setQuotaRange = React.useCallback(
    (min: number | undefined, max: number | undefined) => {
      dt.setFilters((prev) => ({ ...prev, quotaMin: min, quotaMax: max }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCustomDateRange = React.useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      dt.setFilters((prev) => ({ ...prev, createdFrom: from, createdTo: to }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setEstablishment = React.useCallback(
    (id: string | undefined, name?: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        selectedEstablishmentId: id,
        searchQuery: id && name ? name : '',
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setManager = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, managedById: id }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setSpecialties = React.useCallback(
    (ids: string[]) => {
      dt.setFilters((prev) => ({ ...prev, specialtyIds: ids }));
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
          <EstablishmentFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleType={toggleTypeFilter}
            onToggleCategory={toggleCategoryFilter}
            onTogglePriorityNetwork={togglePriorityNetworkFilter}
            onToggleQpv={setQpv}
            onToggleStatus={toggleStatusFilter}
            onSetCity={setCity}
            onSetDepartment={setDepartment}
            onSetCalendarType={setCalendarType}
            onSetSearchQuery={setSearchQuery}
            onSetQuotaRange={setQuotaRange}
            onSetEstablishment={setEstablishment}
            onSetCustomDateRange={setCustomDateRange}
            onSetManager={setManager}
            onSetSpecialties={setSpecialties}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleTypeFilter,
      toggleCategoryFilter,
      togglePriorityNetworkFilter,
      setQpv,
      toggleStatusFilter,
      setCity,
      setDepartment,
      setCalendarType,
      setSearchQuery,
      setQuotaRange,
      setEstablishment,
      setCustomDateRange,
      setManager,
      setSpecialties,
    ],
  );

  const expandedEstablishment = React.useMemo(
    () => establishments.find((e) => e.id === expandedRowId) ?? expandedEstablishmentData ?? null,
    [expandedRowId, establishments, expandedEstablishmentData],
  );

  return (
    <DataTable
      data={establishments}
      totalItems={totalItems}
      isLoading={isLoading}
      viewMode={dt.viewMode}
      onViewModeChange={dt.handleViewModeChange}
      currentPage={dt.currentPage}
      totalPages={totalPages}
      startIndex={startIndex}
      endIndex={endIndex}
      itemLabel="établissements"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={showVscCount ? 11 : 10}
      toolbarActions={
        <>
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => {
                if (dt.showFilters) dt.setShowConfigure(false);
                dt.setShowFilters((prev) => !prev);
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
                  ? 'Aucun établissement à exporter avec les filtres actuels.'
                  : 'Exporter la liste des établissements en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateClick && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un établissement"
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
            resultLabel="établissement(s)"
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
          <th>Type</th>
          <th>Catégorie</th>
          <th>REP</th>
          <th>QPV</th>
          <th>IPS</th>
          <th>Département</th>
          <th>Ancienneté partenariat</th>
          <th className="text-center">Salles</th>
          {showVscCount && <th className="text-center">Nbre de VSC par établissement</th>}
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(establishment) => (
        <EstablishmentRow
          establishment={establishment}
          showVscCount={showVscCount}
          onView={onToggleRow ? () => onToggleRow(establishment.id) : undefined}
          onEdit={onEditEstablishment}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(establishment) => (
        <DetailsViewContent data={establishment} type="establishment" />
      )}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(establishment) => (
        <EstablishmentCard
          establishment={establishment}
          showVscCount={showVscCount}
          onView={onToggleRow ? () => onToggleRow(establishment.id) : undefined}
          onEdit={onEditEstablishment}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Building2}
      emptyText="Aucun établissement trouvé"
      title="Établissements"
      isSection={isSection}
      expandedItem={expandedEstablishment}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(establishment) => (
        <DetailsViewContent data={establishment} type="establishment" />
      )}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={establishmentToDelete?.name}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
