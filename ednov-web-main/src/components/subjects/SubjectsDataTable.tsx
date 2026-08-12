import * as React from 'react';
import { Filter, Download, BookOpen, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { SubjectRow } from './SubjectRow';
import { SubjectCard } from './SubjectCard';
import { SubjectFiltersContent } from './SubjectFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getSubjects, deleteSubject, exportSubjectsExcel } from '@/services/academic.service';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SUBJECT_FILTERS,
  ALL_FILTER_GROUP_IDS,
  type SubjectFilters,
  type FilterGroupId,
  FILTER_GROUP_LABELS,
} from './subject-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { Subject } from '@/types/subject.types';

interface SubjectsDataTableProps {
  showCreateButton?: boolean;
  onCreateSubject?: () => void;
  subjects?: Subject[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditSubject?: (id: string) => void;
  enableFilters?: boolean;
  defaultFilters?: SubjectFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canExportCsv?: boolean };
}

export const SubjectsDataTable: React.FC<SubjectsDataTableProps> = ({
  subjects: externalSubjects,
  showCreateButton = false,
  onCreateSubject,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditSubject,
  enableFilters = true,
  defaultFilters = DEFAULT_SUBJECT_FILTERS,
  layoutWidth = 'full',
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const dt = useDataTable<SubjectFilters, FilterGroupId>({
    tableName: 'subjects',
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
    queryKey: ['subjects', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () =>
      getSubjects({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
      }),
    enabled: !externalSubjects,
    staleTime: 5 * 60 * 1000,
  });

  const data = React.useMemo(
    () => externalSubjects ?? (apiResponse?.data || []),
    [externalSubjects, apiResponse?.data],
  );
  const totalItems = apiResponse?.total ?? data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalSubjects ? data.length === 0 : !isLoading && totalItems === 0),
    [externalSubjects, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucune matière à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      await exportSubjectsExcel();
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [isEmptyForExport]);

  const { data: expandedSubjectData } = useQuery({
    queryKey: ['subjects', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      const { getSubject } = await import('@/services/academic.service');
      return await getSubject(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((s) => s.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.cycles.length > 0 || dt.filters.statuses.length > 0 || dt.filters.isCore !== null,
    [dt.filters],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      dt.setDeleteId(null);
      toast.success('Matière supprimée avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const subjectToDelete = React.useMemo(
    () => data.find((s) => s.id === dt.deleteId),
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

  const toggleCoreFilter = React.useCallback(() => {
    dt.setFilters((prev) => {
      let nextValue: boolean | null;
      if (prev.isCore === null) nextValue = true;
      else if (prev.isCore === true) nextValue = false;
      else nextValue = null;
      return { ...prev, isCore: nextValue };
    });
    dt.setCurrentPage(1);
  }, [dt]);

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <SubjectFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleCycle={toggleCycleFilter}
            onToggleStatus={toggleStatusFilter}
            onToggleCore={toggleCoreFilter}
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
      toggleCoreFilter,
    ],
  );

  const expandedSubject = React.useMemo(
    () => data.find((s) => s.id === expandedRowId) ?? expandedSubjectData ?? null,
    [expandedRowId, data, expandedSubjectData],
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
      itemLabel="matières"
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
                  ? 'Aucune matière à exporter avec les filtres actuels.'
                  : 'Exporter la liste des matières en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}
          {showCreateButton && onCreateSubject && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer une matière"
              onClick={() => {
                onCloseDetails?.();
                onCreateSubject();
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
            resultLabel="matière(s)"
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
          <th>Cycle éducatif</th>
          <th>Type</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(subject) => (
        <SubjectRow
          subject={subject}
          onView={onToggleRow ? () => onToggleRow(subject.id) : undefined}
          onEdit={onEditSubject}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(subject) => <DetailsViewContent data={subject} type="subject" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(subject) => (
        <SubjectCard
          subject={subject}
          onView={onToggleRow ? () => onToggleRow(subject.id) : undefined}
          onEdit={onEditSubject}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={BookOpen}
      emptyText="Aucune matière trouvée"
      title="Matières"
      isSection={isSection}
      expandedItem={expandedSubject}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(subject) => <DetailsViewContent data={subject} type="subject" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={subjectToDelete?.label}
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
