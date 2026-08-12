import * as React from 'react';
import * as XLSX from 'xlsx';
import { Filter, Download, HeartHandshake, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Spinner } from '@/components/ui/spinner';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { PairRow } from './PairRow';
import { PairCard } from './PairCard';
import { PairFiltersContent } from './PairFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import {
  getSessionStudentTutorPairs,
  getSessionStudentTutorPair,
} from '@/services/matching.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PAIR_FILTERS,
  ALL_PAIR_FILTER_GROUP_IDS,
  PAIR_FILTER_GROUP_LABELS,
  PAIR_TYPE_CONFIG,
  type PairFilters,
  type PairFilterGroupId,
} from './pair-configs';
import type { ElementWidth } from '@/types/interface-elements.types';

interface PairsDataTableProps {
  onNavigateToConfig: () => void;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  /** Copilot page-context: focused pair with student/tutor/session labels (no architecture change). */
  onFocusedPairChange?: (
    pair: import('@/types/matching.types').SessionStudentTutorPair | null,
  ) => void;
  pageActions?: { canDeleteRow?: boolean; canExportCsv?: boolean };
}

export const PairsDataTable: React.FC<PairsDataTableProps> = ({
  onNavigateToConfig,
  layoutWidth: layoutWidthProp = 'full',
  isSection = false,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onFocusedPairChange,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;
  const [isExporting, setIsExporting] = React.useState(false);

  const dt = useDataTable<PairFilters, PairFilterGroupId>({
    tableName: 'matching-pairs',
    defaultFilters: DEFAULT_PAIR_FILTERS,
    allFilterGroupIds: ALL_PAIR_FILTER_GROUP_IDS,
    layoutWidth: layoutWidthProp,
    isSection,
    externalExpandedRowId: expandedRowId,
    onCloseDetails,
  });

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['matching-pairs', dt.currentPage, dt.itemsPerPage, dt.filters],
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
          case 'today':
            dateFrom = startOfToday;
            dateTo = new Date(startOfToday);
            dateTo.setDate(dateTo.getDate() + 1);
            break;
          case 'week':
            dateFrom = new Date(startOfToday);
            dateFrom.setDate(dateFrom.getDate() - 7);
            dateTo = new Date(startOfToday);
            dateTo.setDate(dateTo.getDate() + 1);
            break;
          case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        }
      }

      return await getSessionStudentTutorPairs({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        types: dt.filters.types.length > 0 ? dt.filters.types : undefined,
        establishmentId: dt.filters.establishmentId,
        subjectId: dt.filters.subjectId,
        tutorSearch: dt.filters.tutorSearch,
        studentSearch: dt.filters.studentSearch,
        dateFrom,
        dateTo,
      });
    },
    staleTime: 30 * 1000,
  });

  const pairs = React.useMemo(() => apiResponse?.data || [], [apiResponse?.data]);
  const totalItems = apiResponse?.total || 0;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const isEmptyForExport = React.useMemo(() => !pairs || pairs.length === 0, [pairs]);

  // Query séparée si le pair expanded n'est pas dans la page courante
  const { data: expandedPairData } = useQuery({
    queryKey: ['matching-pairs', 'single', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      return await getSessionStudentTutorPair(expandedRowId);
    },
    enabled: !!expandedRowId && !pairs.some((p) => p.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  const expandedItem = React.useMemo(
    () => pairs.find((p) => p.id === dt.expandedRowId) ?? expandedPairData ?? null,
    [pairs, dt.expandedRowId, expandedPairData],
  );

  React.useEffect(() => {
    onFocusedPairChange?.(expandedItem ?? null);
  }, [expandedItem, onFocusedPairChange]);

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.types.length > 0 ||
      dt.filters.dateRange !== DEFAULT_PAIR_FILTERS.dateRange ||
      !!dt.filters.customDateFrom ||
      !!dt.filters.customDateTo ||
      !!dt.filters.establishmentId ||
      !!dt.filters.subjectId ||
      !!dt.filters.tutorSearch ||
      !!dt.filters.studentSearch,
    [dt.filters],
  );

  const clearFilters = React.useCallback(() => {
    dt.setFilters(DEFAULT_PAIR_FILTERS);
    dt.setCurrentPage(1);
  }, [dt]);

  const deleteMutation = useMutation({
    mutationFn: async (_id: string) => {
      throw new Error('Delete not implemented yet');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-pairs'] });
      dt.setDeleteId(null);
      toast.success('Binôme supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const pairToDelete = React.useMemo(
    () => pairs.find((p) => p.id === dt.deleteId),
    [pairs, dt.deleteId],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        'Élève',
        'Email Élève',
        'Tuteur',
        'Email Tuteur',
        'Type',
        'Séance',
        'Date',
        'Heure',
        'Établissement',
        'Matière',
      ];

      const formatDate = (date: Date | string | undefined) => {
        if (!date) return '-';
        try {
          const d = typeof date === 'string' ? new Date(date) : date;
          if (Number.isNaN(d.getTime())) return '-';
          return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(d);
        } catch {
          return '-';
        }
      };

      const formatTime = (time: string | undefined | null) => {
        if (!time) return '';
        return time.slice(0, 5);
      };

      const rows = pairs.map((pair) => {
        const tutorDisplay =
          pair.tutorUser?.displayName?.trim() ||
          `${pair.tutorUser?.firstName || ''} ${pair.tutorUser?.lastName || ''}`.trim() ||
          '-';
        return [
          pair.studentUser?.displayName || '-',
          pair.studentUser?.email ?? '',
          tutorDisplay,
          pair.tutorUser?.email ?? '',
          PAIR_TYPE_CONFIG[pair.assignmentSource]?.label || pair.assignmentSource,
          `Séance ${formatDate(pair.session?.sessionDate)}`,
          formatDate(pair.session?.sessionDate),
          `${formatTime(pair.session?.startTime)} - ${formatTime(pair.session?.endTime)}`,
          pair.session?.establishment?.name || '-',
          pair.session?.subject?.label || '-',
        ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Matchings');
      XLSX.writeFile(workbook, `matchings-${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast.success('Export Excel réussi !');
    } catch (error) {
      console.error("Erreur lors de l'export Excel:", error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [pairs, isEmptyForExport]);

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

  const setTutorSearch = React.useCallback(
    (search: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, tutorSearch: search }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setStudentSearch = React.useCallback(
    (search: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, studentSearch: search }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setDateRange = React.useCallback(
    (range: PairFilters['dateRange']) => {
      dt.setFilters((prev) => ({ ...prev, dateRange: range }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setCustomDateRange = React.useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      dt.setFilters((prev) => ({
        ...prev,
        customDateFrom: from,
        customDateTo: to,
        dateRange: from || to ? 'all' : prev.dateRange,
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

  const setSubject = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, subjectId: id }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const filtersContent = React.useMemo(
    () => (
      <PairFiltersContent
        filters={dt.filters}
        allowedFilterIds={dt.allowedFilterIds}
        visibleFilterIds={dt.visibleFilterIds}
        onToggleType={toggleTypeFilter}
        onSetTutorSearch={setTutorSearch}
        onSetStudentSearch={setStudentSearch}
        onSetDateRange={setDateRange}
        onSetCustomDateRange={setCustomDateRange}
        onSetEstablishment={setEstablishment}
        onSetSubject={setSubject}
      />
    ),
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleTypeFilter,
      setTutorSearch,
      setStudentSearch,
      setDateRange,
      setCustomDateRange,
      setEstablishment,
      setSubject,
    ],
  );

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => filtersContent,
      },
    ],
    [filtersContent],
  );

  return (
    <DataTable
      data={pairs}
      totalItems={totalItems}
      isLoading={isLoading}
      viewMode={dt.viewMode}
      onViewModeChange={dt.handleViewModeChange}
      currentPage={dt.currentPage}
      totalPages={totalPages}
      startIndex={startIndex}
      endIndex={endIndex}
      itemLabel="binômes"
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
              const next = !dt.showFilters;
              dt.setShowFilters(next);
              if (!next) dt.setShowConfigure(false);
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
                  ? 'Aucun binôme à exporter avec les filtres actuels.'
                  : 'Exporter la liste des binômes en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}

          <Button
            preset="toolbar-create"
            tooltipText="Configurer les affectations"
            onClick={() => {
              dt.setExpandedRowId(null);
              onNavigateToConfig();
            }}
          />
        </>
      }
      filtersPanel={
        <DataTableFilters
          show={dt.showFilters}
          hasActiveFilters={hasActiveFilters}
          filterGroups={filterGroups}
          onClearFilters={clearFilters}
          resultCount={totalItems}
          resultLabel="binôme(s)"
          onToggleConfigure={
            dt.allowedFilterIds.length > 0 ? () => dt.setShowConfigure((v) => !v) : undefined
          }
          showConfigure={dt.showConfigure}
          configureContent={
            <div className="flex flex-wrap gap-3">
              {ALL_PAIR_FILTER_GROUP_IDS.filter((id) => dt.allowedFilterIds.includes(id)).map(
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
                      {PAIR_FILTER_GROUP_LABELS[id]}
                    </Button>
                  );
                },
              )}
            </div>
          }
        />
      }
      renderTableHead={() => (
        <tr>
          <th>Élève</th>
          <th>Tuteur</th>
          <th>Séance</th>
          <th>Établissement</th>
          <th>Matière</th>
          <th>Type</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(pair) => (
        <PairRow
          pair={pair}
          onView={onToggleRow ? () => onToggleRow(pair.id) : () => dt.setExpandedRowId(pair.id)}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(pair) => <DetailsViewContent data={pair} type="pair" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(pair) => (
        <PairCard
          pair={pair}
          onView={onToggleRow ? () => onToggleRow(pair.id) : () => dt.setExpandedRowId(pair.id)}
          onDelete={(id) => dt.setDeleteId(id)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={HeartHandshake}
      emptyText="Aucun binôme trouvé"
      title="Binômes"
      isSection={isSection}
      expandedItem={expandedItem}
      onCloseDetails={onCloseDetails || (() => dt.setExpandedRowId(null))}
      renderDetailsContent={(pair) => <DetailsViewContent data={pair} type="pair" />}
      modals={
        <DeleteModal
          open={!!dt.deleteId}
          onClose={() => dt.setDeleteId(null)}
          onConfirm={() => {
            if (dt.deleteId) deleteMutation.mutate(dt.deleteId);
          }}
          itemName={
            pairToDelete
              ? (() => {
                  const studentName = pairToDelete.studentUser?.displayName || 'Élève';
                  const tutorName =
                    `${pairToDelete.tutorUser?.firstName || ''} ${pairToDelete.tutorUser?.lastName || ''}`.trim() ||
                    'Tuteur';
                  return `${studentName} ↔ ${tutorName}`;
                })()
              : undefined
          }
          isLoading={deleteMutation.isPending}
        />
      }
    />
  );
};
