import * as React from 'react';
import { Filter, Download, User as UserIcon, Plus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { StudentRow } from './StudentRow';
import { StudentCard } from './StudentCard';
import { StudentFiltersContent } from './StudentFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { useDataTable } from '@/hooks/useDataTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { deleteStudent } from '@/services/students.service';
import { getStudents, exportStudentsExcel } from '@/services/users.service';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { cn } from '@/lib/utils';
import {
  DEFAULT_STUDENT_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type StudentFilters,
  type FilterGroupId,
} from './student-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { Student } from '@/types/student.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface StudentsDataTableProps {
  students?: Student[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditStudent?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: StudentFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
  showCreateButton?: boolean;
  onCreateStudent?: () => void;
}

export const StudentsDataTable: React.FC<StudentsDataTableProps> = ({
  students: externalStudents,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  showCreateButton = false,
  onCreateStudent,
  onEditStudent,
  enableFilters = true,
  defaultFilters = DEFAULT_STUDENT_FILTERS,
  layoutWidth: layoutWidthProp = 'full',
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;
  const [isExporting, setIsExporting] = React.useState(false);

  const dt = useDataTable<StudentFilters, FilterGroupId>({
    tableName: 'students',
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
    queryKey: ['users', 'student', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getStudents({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        subjectIds: dt.filters.subjects.length > 0 ? dt.filters.subjects : undefined,
        levelIds: dt.filters.levelIds.length > 0 ? dt.filters.levelIds : undefined,
        classIds: dt.filters.classIds.length > 0 ? dt.filters.classIds : undefined,
        specialtyIds:
          dt.filters.specialtyIds && dt.filters.specialtyIds.length > 0
            ? dt.filters.specialtyIds
            : undefined,
        establishmentId: dt.filters.establishmentId,
        dateFrom: dt.filters.createdFrom,
        dateTo: dt.filters.createdTo,
        isMinor: dt.filters.isMinor,
        hasSpecialNeeds: dt.filters.hasSpecialNeeds,
        exitDateFrom: dt.filters.exitDateFrom,
        exitDateTo: dt.filters.exitDateTo,
        exitReason: dt.filters.exitReason,
      }),
    enabled: !externalStudents,
    staleTime: 5 * 60 * 1000,
  });

  const data = React.useMemo(
    () => externalStudents ?? ((apiResponse?.data || []) as Student[]),
    [externalStudents, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const isEmptyForExport = React.useMemo(
    () => (externalStudents ? data.length === 0 : !isLoading && totalItems === 0),
    [externalStudents, data.length, isLoading, totalItems],
  );
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  // Requête séparée si l'étudiant expanded n'est pas dans la page courante
  const { data: expandedStudentData } = useQuery({
    queryKey: ['users', 'student', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getStudent } = await import('@/services/users.service');
      return await getStudent(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((s) => s.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const expandedItem = React.useMemo(
    () => data.find((s) => s.id === expandedRowId) ?? expandedStudentData ?? null,
    [expandedRowId, data, expandedStudentData],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Étudiant supprimé avec succès !');
      dt.setDeleteId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const studentToDelete = React.useMemo(
    () => data.find((s) => s.id === dt.deleteId),
    [data, dt.deleteId],
  );

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      dt.filters.levelIds.length > 0 ||
      dt.filters.subjects.length > 0 ||
      dt.filters.classIds.length > 0 ||
      (dt.filters.specialtyIds && dt.filters.specialtyIds.length > 0) ||
      dt.filters.establishmentId !== undefined ||
      dt.filters.createdFrom !== undefined ||
      dt.filters.createdTo !== undefined ||
      dt.filters.isMinor !== undefined ||
      dt.filters.hasSpecialNeeds !== undefined ||
      dt.filters.exitDateFrom !== undefined ||
      dt.filters.exitDateTo !== undefined ||
      dt.filters.exitReason !== undefined,
    [dt.filters],
  );

  const clearFilters = React.useCallback(() => {
    dt.setFilters(defaultFilters);
    dt.setCurrentPage(1);
  }, [dt, defaultFilters]);

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

  const toggleGradeLevelFilter = React.useCallback(
    (levelId: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        levelIds: prev.levelIds.includes(levelId)
          ? prev.levelIds.filter((id) => id !== levelId)
          : [...prev.levelIds, levelId],
        classIds: [],
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
          ? prev.subjects.filter((id) => id !== subjectId)
          : [...prev.subjects, subjectId],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setEstablishment = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, establishmentId: id, classIds: [] }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleClassFilter = React.useCallback(
    (classId: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        classIds: prev.classIds.includes(classId)
          ? prev.classIds.filter((id) => id !== classId)
          : [...prev.classIds, classId],
      }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setClass = React.useCallback(
    (classId: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, classIds: classId ? [classId] : [] }));
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

  const setCustomDateRange = React.useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      dt.setFilters((prev) => ({ ...prev, createdFrom: from, createdTo: to }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const toggleIsMinor = React.useCallback(
    (value: boolean | undefined) => {
      dt.setFilters((prev) => ({ ...prev, isMinor: value }));
    },
    [dt],
  );

  const toggleHasSpecialNeeds = React.useCallback(
    (value: boolean | undefined) => {
      dt.setFilters((prev) => ({ ...prev, hasSpecialNeeds: value }));
    },
    [dt],
  );

  const setExitDateRange = React.useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      dt.setFilters((prev) => ({ ...prev, exitDateFrom: from, exitDateTo: to }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setExitReason = React.useCallback(
    (reason: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, exitReason: reason }));
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
          <StudentFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onToggleGradeLevel={toggleGradeLevelFilter}
            onToggleSubject={toggleSubjectFilter}
            onSetEstablishment={setEstablishment}
            onSetClass={setClass}
            onSetSpecialties={setSpecialties}
            onSetCustomDateRange={setCustomDateRange}
            onToggleIsMinor={toggleIsMinor}
            onToggleHasSpecialNeeds={toggleHasSpecialNeeds}
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
      toggleGradeLevelFilter,
      toggleSubjectFilter,
      setEstablishment,
      setClass,
      setSpecialties,
      setCustomDateRange,
      toggleIsMinor,
      toggleHasSpecialNeeds,
      setExitDateRange,
      setExitReason,
    ],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (externalStudents ? data.length === 0 : !isLoading && totalItems === 0) {
      toast.warning(
        'Aucun élève à exporter avec les filtres actuels. Modifiez ou réinitialisez les filtres.',
      );
      return;
    }
    setIsExporting(true);
    try {
      await exportStudentsExcel({
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        levelIds: dt.filters.levelIds.length > 0 ? dt.filters.levelIds : undefined,
        subjectIds: dt.filters.subjects.length > 0 ? dt.filters.subjects : undefined,
        establishmentId: dt.filters.establishmentId,
        dateFrom: dt.filters.createdFrom,
        dateTo: dt.filters.createdTo,
        isMinor: dt.filters.isMinor,
        hasSpecialNeeds: dt.filters.hasSpecialNeeds,
        exitDateFrom: dt.filters.exitDateFrom,
        exitDateTo: dt.filters.exitDateTo,
        exitReason: dt.filters.exitReason,
      });
      toast.success('Export Excel réussi !');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [data.length, dt.filters, externalStudents, isLoading, totalItems]);

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
      itemLabel="élèves"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={7}
      toolbarActions={
        <>
          {enableFilters && (
            <Button
              preset="toolbar-filter"
              className={cn(dt.showFilters && 'section-action-button-active')}
              showBadge={hasActiveFilters}
              onClick={() => {
                const next = !dt.showFilters;
                dt.setShowFilters(next);
                if (!next) dt.setShowConfigure(false);
              }}
            />
          )}
          {showExport && (
            <Button
              preset="toolbar-export"
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucun élève à exporter avec les filtres actuels. Modifiez ou réinitialisez les filtres.'
                  : 'Exporter la liste des élèves en Excel'
              }
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateStudent && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer un élève"
              onClick={() => {
                onCloseDetails?.();
                onCreateStudent();
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
            resultLabel="élève(s)"
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
          <th className="text-center">Genre</th>
          <th className="text-center">Niveau</th>
          <th className="text-center">Statut</th>
          <th className="text-center">Profil</th>
          <th className="text-center">Établissement(s)</th>
          <th className="text-center">Date d'entrée</th>
          <th className="text-center">Date de sortie</th>
          <th className="text-center">Motif de sortie</th>
          <th className="text-center">Taux de présence</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(student) => (
        <StudentRow
          student={student as Student}
          onView={onToggleRow ? () => onToggleRow(student.id) : undefined}
          onEdit={onEditStudent}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(student) => <DetailsViewContent data={student} type="student" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(student) => (
        <StudentCard
          student={student as Student}
          onView={onToggleRow ? () => onToggleRow(student.id) : undefined}
          onEdit={onEditStudent}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={UserIcon}
      emptyText="Aucun élève trouvé"
      title="Élèves"
      isSection={isSection}
      expandedItem={expandedItem as Student | null}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(student) => <DetailsViewContent data={student} type="student" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={studentToDelete ? studentToDelete.displayName || 'Cet élève' : ''}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
