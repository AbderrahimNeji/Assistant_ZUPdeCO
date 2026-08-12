import * as React from 'react';
import { Filter, Download, User as UserIcon, Plus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { VolunteerRow } from './VolunteerRow';
import { VolunteerCard } from './VolunteerCard';
import { VolunteerFiltersContent } from './VolunteerFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getVolunteers, exportVolunteersExcel } from '@/services/users.service';
import { deleteVolunteer } from '@/services/volunteers.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_VOLUNTEER_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type VolunteerFilters,
  type FilterGroupId,
} from './volunteer-configs';
import { tutorDisponibiliteKeysToAvailabilityDays } from '@/components/tutors/tutor-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { Volunteer } from '@/types/volunteer.types';

interface VolunteersDataTableProps {
  volunteers?: Volunteer[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  enableFilters?: boolean;
  defaultFilters?: VolunteerFilters;
  showCreateButton?: boolean;
  onCreateVolunteer?: () => void;
  onEditVolunteer?: (id: string) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  /** Filter fetched volunteers by role codes (driven by tab selection). */
  enabledRoles?: string[];
}

export const VolunteersDataTable: React.FC<VolunteersDataTableProps> = ({
  volunteers: externalVolunteers,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth: layoutWidthProp = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditVolunteer,
  enableFilters = true,
  defaultFilters = DEFAULT_VOLUNTEER_FILTERS,
  isSection = false,
  pageActions,
  showCreateButton = false,
  onCreateVolunteer,
  enabledRoles,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;
  const [isExporting, setIsExporting] = React.useState(false);

  const dt = useDataTable<VolunteerFilters, FilterGroupId>({
    tableName: 'volunteers',
    defaultFilters,
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
    layoutWidth: layoutWidthProp,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['users', 'volunteer', dt.currentPage, dt.itemsPerPage, dt.filters, enabledRoles],
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

      const days = tutorDisponibiliteKeysToAvailabilityDays(dt.filters.availability ?? []);

      return await getVolunteers({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        subjectIds: dt.filters.subjects.length > 0 ? dt.filters.subjects : undefined,
        establishmentId: dt.filters.establishmentId,
        dateFrom: dt.filters.entryDateFrom ? new Date(dt.filters.entryDateFrom) : dateFrom,
        dateTo: dt.filters.entryDateTo ? new Date(dt.filters.entryDateTo) : dateTo,
        availabilityDays: days.length > 0 ? days : undefined,
        roleCodes: enabledRoles && enabledRoles.length > 0 ? enabledRoles : undefined,
        engagementStartDateFrom: dt.filters.engagementStartDateFrom,
        engagementStartDateTo: dt.filters.engagementStartDateTo,
        tutorExitDateFrom: dt.filters.exitDateFrom,
        tutorExitDateTo: dt.filters.exitDateTo,
        tutorExitReason: dt.filters.exitReason || undefined,
      });
    },
    enabled: !externalVolunteers,
  });

  const data = React.useMemo(
    () => externalVolunteers ?? (apiResponse?.data || []),
    [externalVolunteers, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const isEmptyForExport = React.useMemo(
    () => (externalVolunteers ? data.length === 0 : !isLoading && totalItems === 0),
    [externalVolunteers, data.length, isLoading, totalItems],
  );
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const { data: expandedVolunteerData } = useQuery({
    queryKey: ['users', 'volunteer', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getVolunteer } = await import('@/services/users.service');
      return await getVolunteer(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((v) => v.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const expandedItem = React.useMemo(
    () => data.find((v) => v.id === expandedRowId) ?? expandedVolunteerData ?? null,
    [expandedRowId, data, expandedVolunteerData],
  );

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.subjects.length > 0 ||
      (dt.filters.availability && dt.filters.availability.length > 0) ||
      dt.filters.establishmentId !== undefined ||
      dt.filters.dateRange !== 'all' ||
      dt.filters.customDateFrom !== undefined ||
      dt.filters.customDateTo !== undefined ||
      !!dt.filters.entryDateFrom ||
      !!dt.filters.entryDateTo ||
      !!dt.filters.engagementStartDateFrom ||
      !!dt.filters.engagementStartDateTo ||
      !!dt.filters.exitDateFrom ||
      !!dt.filters.exitDateTo ||
      !!dt.filters.exitReason,
    [dt.filters],
  );

  const clearFilters = React.useCallback(() => {
    dt.setFilters(defaultFilters);
    dt.setCurrentPage(1);
  }, [dt, defaultFilters]);

  const resolveExportDateRange = React.useCallback(() => {
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
    return { dateFrom, dateTo };
  }, [dt.filters]);

  const handleExportExcel = React.useCallback(async () => {
    if (externalVolunteers ? data.length === 0 : !isLoading && totalItems === 0) {
      toast.warning(
        'Aucun bénévole (VSC) à exporter avec les filtres actuels. Modifiez ou réinitialisez les filtres.',
      );
      return;
    }
    setIsExporting(true);
    try {
      const { dateFrom, dateTo } = resolveExportDateRange();
      const days = tutorDisponibiliteKeysToAvailabilityDays(dt.filters.availability ?? []);
      await exportVolunteersExcel({
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        subjectIds: dt.filters.subjects.length > 0 ? dt.filters.subjects : undefined,
        establishmentId: dt.filters.establishmentId,
        dateFrom,
        dateTo,
        availabilityDays: days.length > 0 ? days : undefined,
      });
      toast.success('Export Excel réussi !');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [data.length, dt.filters, externalVolunteers, isLoading, resolveExportDateRange, totalItems]);

  const deleteMutation = useMutation({
    mutationFn: deleteVolunteer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Volontaire supprimé avec succès !');
      dt.setDeleteId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const volunteerToDelete = React.useMemo(
    () => data.find((v) => v.id === dt.deleteId),
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

  const setSubject = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, subjects: id ? [id] : [] }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleAvailability = React.useCallback(
    (day: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        availability: prev.availability?.includes(day)
          ? prev.availability.filter((d) => d !== day)
          : [...(prev.availability || []), day],
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
    (range: VolunteerFilters['dateRange']) => {
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

  const setEngagementStartDateRange = React.useCallback(
    (from: string | undefined, to: string | undefined) => {
      dt.setFilters((prev) => ({
        ...prev,
        engagementStartDateFrom: from,
        engagementStartDateTo: to,
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setExitDateRange = React.useCallback(
    (from: string | undefined, to: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, exitDateFrom: from, exitDateTo: to }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setExitReason = React.useCallback(
    (reason: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, exitReason: reason }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setEntryDateRange = React.useCallback(
    (from: string | undefined, to: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, entryDateFrom: from, entryDateTo: to }));
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
          <VolunteerFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onSetSubject={setSubject}
            onToggleAvailability={toggleAvailability}
            onSetEstablishment={setEstablishment}
            onSetDateRange={setDateRange}
            onSetCustomDateRange={setCustomDateRange}
            onSetEntryDateRange={setEntryDateRange}
            onSetEngagementStartDateRange={setEngagementStartDateRange}
            onSetExitDateRange={setExitDateRange}
            onSetExitReason={setExitReason}
          />
        ),
      },
    ],
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleStatusFilter,
      setSubject,
      toggleAvailability,
      setEstablishment,
      setDateRange,
      setCustomDateRange,
      setEntryDateRange,
      setEngagementStartDateRange,
      setExitDateRange,
      setExitReason,
    ],
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
      itemLabel="VSCs"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={13}
      toolbarActions={
        <>
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => {
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
                  ? 'Aucun bénévole (VSC) à exporter avec les filtres actuels. Modifiez ou réinitialisez les filtres.'
                  : 'Exporter la liste des bénévoles en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateVolunteer && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un bénévole"
              onClick={() => {
                onCloseDetails?.();
                onCreateVolunteer();
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
            onClearFilters={clearFilters}
            resultCount={totalItems}
            resultLabel="volontaire(s)"
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
          <th>Matières</th>
          <th>Date d'entrée</th>
          <th>Ancienneté</th>
          <th>Heures réalisées</th>
          <th>Heures à réaliser</th>
          <th>Date de sortie effective</th>
          <th>Taux de présence</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(volunteer) => (
        <VolunteerRow
          volunteer={volunteer}
          onView={onToggleRow ? () => onToggleRow(volunteer.id) : undefined}
          onEdit={onEditVolunteer}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(volunteer) => <DetailsViewContent data={volunteer} type="volunteer" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(volunteer) => (
        <VolunteerCard
          volunteer={volunteer}
          onView={onToggleRow ? () => onToggleRow(volunteer.id) : undefined}
          onEdit={onEditVolunteer}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={UserIcon}
      emptyText="Aucun VSC trouvé"
      title="VSCs"
      isSection={isSection}
      expandedItem={expandedItem}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(volunteer) => <DetailsViewContent data={volunteer} type="volunteer" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={
            volunteerToDelete ? `${volunteerToDelete.firstName} ${volunteerToDelete.lastName}` : ''
          }
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
