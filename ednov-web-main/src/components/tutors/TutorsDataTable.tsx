import * as React from 'react';
import { Filter, Download, User as UserIcon, Plus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { TutorRow } from './TutorRow';
import { TutorCard } from './TutorCard';
import { TutorFiltersContent } from './TutorFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getTutors, exportTutorsExcel } from '@/services/users.service';
import { deleteTutor } from '@/services/tutors.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_TUTOR_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  tutorDisponibiliteKeysToAvailabilityDays,
  type TutorFilters,
  type FilterGroupId,
} from './tutor-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { Tutor } from '@/types/tutor.types';

interface TutorsDataTableProps {
  tutors?: Tutor[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  layoutWidth?: ElementWidth;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditTutor?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: TutorFilters;
  showCreateButton?: boolean;
  onCreateTutor?: () => void;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  /** Filter fetched tutors by role codes (driven by tab selection). */
  enabledRoles?: string[];
}

export const TutorsDataTable: React.FC<TutorsDataTableProps> = ({
  tutors: externalTutors,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  layoutWidth: layoutWidthProp = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditTutor,
  enableFilters = true,
  defaultFilters = DEFAULT_TUTOR_FILTERS,
  showCreateButton = false,
  onCreateTutor,
  isSection = false,
  pageActions,
  enabledRoles,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;
  const [isExporting, setIsExporting] = React.useState(false);

  const dt = useDataTable<TutorFilters, FilterGroupId>({
    tableName: 'tutors',
    defaultFilters,
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
    layoutWidth: layoutWidthProp,
    isSection,
    externalViewMode,
    onExternalViewModeChange: externalOnViewModeChange,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const availabilityDaysParam = React.useMemo(
    () => tutorDisponibiliteKeysToAvailabilityDays(dt.filters.disponibilite),
    [dt.filters.disponibilite],
  );

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['users', 'tutor', dt.currentPage, dt.itemsPerPage, dt.filters, enabledRoles],
    queryFn: async () =>
      getTutors({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        subjectIds: dt.filters.subjects.length > 0 ? dt.filters.subjects : undefined,
        establishmentId: dt.filters.establishmentId,
        availabilityDays: availabilityDaysParam.length > 0 ? availabilityDaysParam : undefined,
        roleCodes: enabledRoles && enabledRoles.length > 0 ? enabledRoles : undefined,
        engagementStartDateFrom: dt.filters.engagementStartDateFrom,
        engagementStartDateTo: dt.filters.engagementStartDateTo,
        tutorExitDateFrom: dt.filters.exitDateFrom,
        tutorExitDateTo: dt.filters.exitDateTo,
        tutorExitReason: dt.filters.exitReason || undefined,
      }),
    enabled: !externalTutors,
    staleTime: 5 * 60 * 1000,
  });

  const data = React.useMemo(
    () => externalTutors ?? (apiResponse?.data || []),
    [externalTutors, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const isEmptyForExport = React.useMemo(
    () => (externalTutors ? data.length === 0 : !isLoading && totalItems === 0),
    [externalTutors, data.length, isLoading, totalItems],
  );
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  // Requête séparée si le tuteur expanded n'est pas dans la page courante
  const { data: expandedTutorData } = useQuery({
    queryKey: ['users', 'tutor', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getTutor } = await import('@/services/users.service');
      return await getTutor(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((t) => t.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const expandedItem = React.useMemo(
    () => data.find((t) => t.id === expandedRowId) ?? expandedTutorData ?? null,
    [expandedRowId, data, expandedTutorData],
  );

  /** Only filters that change the tutors API query (see getTutors in queryFn). */
  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.subjects.length > 0 ||
      dt.filters.establishmentId !== undefined ||
      dt.filters.disponibilite.length > 0 ||
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

  const handleExportExcel = React.useCallback(async () => {
    if (externalTutors ? data.length === 0 : !isLoading && totalItems === 0) {
      toast.warning(
        'Aucun tuteur à exporter avec les filtres actuels. Modifiez ou réinitialisez les filtres.',
      );
      return;
    }
    setIsExporting(true);
    try {
      await exportTutorsExcel({
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        subjectIds: dt.filters.subjects.length > 0 ? dt.filters.subjects : undefined,
        establishmentId: dt.filters.establishmentId,
        availabilityDays:
          tutorDisponibiliteKeysToAvailabilityDays(dt.filters.disponibilite).length > 0
            ? tutorDisponibiliteKeysToAvailabilityDays(dt.filters.disponibilite)
            : undefined,
      });
      toast.success('Export Excel réussi !');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [dt.filters, data.length, externalTutors, isLoading, totalItems]);

  const deleteMutation = useMutation({
    mutationFn: deleteTutor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Tuteur supprimé avec succès !');
      dt.setDeleteId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const tutorToDelete = React.useMemo(
    () => data.find((t) => t.id === dt.deleteId),
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

  const toggleSubjectFilter = React.useCallback(
    (subjectId: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        subjects: prev.subjects.includes(subjectId)
          ? prev.subjects.filter((s) => s !== subjectId)
          : [...prev.subjects, subjectId],
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

  const toggleDisponibilite = React.useCallback(
    (day: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        disponibilite: prev.disponibilite.includes(day)
          ? prev.disponibilite.filter((d) => d !== day)
          : [...prev.disponibilite, day],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setExperienceRange = React.useCallback(
    (min: number | undefined, max: number | undefined) => {
      dt.setFilters((prev) => ({
        ...prev,
        experienceRange: min !== undefined || max !== undefined ? { min, max } : undefined,
      }));
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

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <TutorFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onToggleSubject={toggleSubjectFilter}
            onSetEstablishment={setEstablishment}
            onToggleDisponibilite={toggleDisponibilite}
            onSetExperienceRange={setExperienceRange}
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
      toggleSubjectFilter,
      setEstablishment,
      toggleDisponibilite,
      setExperienceRange,
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
      itemLabel="tuteurs"
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
                if (!dt.showFilters) dt.setShowConfigure(false);
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
                  ? 'Aucun tuteur à exporter avec les filtres actuels. Modifiez ou réinitialisez les filtres.'
                  : 'Exporter la liste des tuteurs en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateTutor && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un tuteur"
              onClick={() => {
                onCloseDetails?.();
                onCreateTutor();
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
            resultLabel="tuteur(s)"
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
          <th>Date de sortie</th>
          <th>Taux de présence</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(tutor) => (
        <TutorRow
          tutor={tutor}
          onView={onToggleRow ? () => onToggleRow(tutor.id) : undefined}
          onEdit={onEditTutor}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(tutor) => <DetailsViewContent data={tutor} type="tutor" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(tutor) => (
        <TutorCard
          tutor={tutor}
          onView={onToggleRow ? () => onToggleRow(tutor.id) : undefined}
          onEdit={onEditTutor}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={UserIcon}
      emptyText="Aucun tuteur trouvé"
      title="Tuteurs"
      isSection={isSection}
      expandedItem={expandedItem}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(tutor) => <DetailsViewContent data={tutor} type="tutor" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={
            tutorToDelete ? `${tutorToDelete.firstName} ${tutorToDelete.lastName}` : undefined
          }
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
