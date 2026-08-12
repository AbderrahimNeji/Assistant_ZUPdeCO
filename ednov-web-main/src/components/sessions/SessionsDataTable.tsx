import * as React from 'react';
import { Calendar, UserCheck, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Spinner } from '@/components/ui/spinner';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/forms/Button';
import { SessionRow } from './SessionRow';
import { SessionCard } from './SessionCard';
import { SessionFiltersContent } from './SessionFilters';
import { DetailsViewContent } from '@/components/common/details/DetailsViewContent';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { AttendanceModal } from './AttendanceModal';
import { useDataTable } from '@/hooks/useDataTable';
import {
  getSessions,
  getSession,
  cancelSession,
  exportSessionsExcel,
} from '@/services/sessions.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SESSION_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  SESSION_TYPE_CONFIG,
  type SessionFilters,
  type FilterGroupId,
} from './session-configs';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import type { SessionStatus } from '@/types/session.types';

interface Session {
  id: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  type: 'homework_help' | 'individual_tutoring' | 'workshop' | 'whole_class' | 'group_tutoring';
  status: SessionStatus;
  establishmentName?: string | null;
  establishment?: { name: string };
}

function buildSessionAssistantLabel(session: Session): string {
  const typeLabel = SESSION_TYPE_CONFIG[session.type]?.label || session.type;
  const date =
    session.sessionDate instanceof Date
      ? session.sessionDate.toLocaleDateString('fr-FR')
      : String(session.sessionDate);
  const est = session.establishmentName ?? session.establishment?.name;
  return est ? `${typeLabel} · ${date} · ${est}` : `${typeLabel} · ${date}`;
}

interface SessionsDataTableProps {
  showCreateButton?: boolean;
  onCreateSession?: () => void;
  sessions?: Session[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
  onEditSession?: (id: string) => void;
  /** Notifies parent when the focused/expanded session changes (for Copilot context). */
  onSessionFocus?: (session: { id: string; label: string } | null) => void;
  enableFilters?: boolean;
  defaultFilters?: SessionFilters;
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  pageActions?: {
    canEditRow?: boolean;
    canCancelRow?: boolean;
    canDeleteRow?: boolean;
    canManageAttendance?: boolean;
    canExportCsv?: boolean;
  };
}

function getDateRangeFromFilters(filters: SessionFilters): {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
} {
  if (filters.customDateFrom || filters.customDateTo) {
    return { dateFrom: filters.customDateFrom, dateTo: filters.customDateTo };
  }
  if (filters.dateRange === 'all') {
    return { dateFrom: undefined, dateTo: undefined };
  }
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (filters.dateRange) {
    case 'today': {
      const dateTo = new Date(startOfToday);
      dateTo.setDate(dateTo.getDate() + 1);
      return { dateFrom: startOfToday, dateTo };
    }
    case 'week': {
      const dateFrom = new Date(startOfToday);
      dateFrom.setDate(dateFrom.getDate() - 7);
      const dateTo = new Date(startOfToday);
      dateTo.setDate(dateTo.getDate() + 1);
      return { dateFrom, dateTo };
    }
    case 'month':
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
        dateTo: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }
}

export const SessionsDataTable: React.FC<SessionsDataTableProps> = ({
  sessions: externalSessions,
  showCreateButton = false,
  onCreateSession,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  expandedRowId,
  onToggleRow,
  onCloseDetails,
  onEditSession,
  onSessionFocus,
  enableFilters = true,
  defaultFilters = DEFAULT_SESSION_FILTERS,
  layoutWidth: layoutWidthProp = 'full',
  isSection = false,
  pageActions,
}) => {
  const queryClient = useQueryClient();
  const showExport = pageActions?.canExportCsv === true;

  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = React.useState<string | null>(null);

  const dt = useDataTable<SessionFilters, FilterGroupId>({
    tableName: 'sessions',
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
    queryKey: ['sessions', dt.currentPage, dt.itemsPerPage, dt.filters],
    queryFn: async () => {
      const { dateFrom, dateTo } = getDateRangeFromFilters(dt.filters);
      return await getSessions({
        page: dt.currentPage,
        pageSize: dt.itemsPerPage,
        types: dt.filters.types.length > 0 ? dt.filters.types : undefined,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        dateFrom,
        dateTo,
        establishmentId: dt.filters.establishmentId,
        subjectId: dt.filters.subjectId,
        levelId: dt.filters.levelId,
        search: dt.filters.search || undefined,
        recurrenceType: dt.filters.recurrenceType,
      });
    },
    enabled: !externalSessions,
  });

  const data = React.useMemo(
    () => externalSessions ?? (apiResponse?.data || []),
    [externalSessions, apiResponse?.data],
  );
  const totalItems = apiResponse?.total || data.length;
  const totalPages = Math.ceil(totalItems / dt.itemsPerPage) || 1;
  const startIndex = (dt.currentPage - 1) * dt.itemsPerPage;
  const endIndex = startIndex + dt.itemsPerPage;

  const [isExporting, setIsExporting] = React.useState(false);
  const isEmptyForExport = React.useMemo(
    () => (externalSessions ? data.length === 0 : !isLoading && totalItems === 0),
    [externalSessions, data.length, isLoading, totalItems],
  );

  const handleExportExcel = React.useCallback(async () => {
    if (isEmptyForExport) {
      toast.warning('Aucune séance à exporter avec les filtres actuels.');
      return;
    }
    setIsExporting(true);
    try {
      const { dateFrom, dateTo } = getDateRangeFromFilters(dt.filters);
      await exportSessionsExcel({
        types: dt.filters.types.length > 0 ? dt.filters.types : undefined,
        statuses: dt.filters.statuses.length > 0 ? dt.filters.statuses : undefined,
        dateFrom,
        dateTo,
        establishmentId: dt.filters.establishmentId,
        subjectId: dt.filters.subjectId,
        levelId: dt.filters.levelId,
      });
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  }, [dt.filters, isEmptyForExport]);

  // Requête séparée si la session expanded n'est pas dans la page courante
  const { data: expandedSessionData } = useQuery({
    queryKey: ['sessions', expandedRowId],
    queryFn: async () => {
      if (!expandedRowId) return null;
      return await getSession(expandedRowId);
    },
    enabled: !!expandedRowId && !data.some((s) => s.id === expandedRowId),
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (!onSessionFocus) return;
    if (!expandedRowId) {
      onSessionFocus(null);
      return;
    }
    const session =
      data.find((s) => s.id === expandedRowId) ?? expandedSessionData ?? null;
    if (session) {
      onSessionFocus({
        id: session.id,
        label: buildSessionAssistantLabel(session),
      });
    } else {
      onSessionFocus({
        id: expandedRowId,
        label: `Séance ${expandedRowId.slice(0, 8)}`,
      });
    }
  }, [expandedRowId, data, expandedSessionData, onSessionFocus]);

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.types.length > 0 ||
      dt.filters.statuses.length > 0 ||
      dt.filters.dateRange !== defaultFilters.dateRange ||
      !!dt.filters.customDateFrom ||
      !!dt.filters.customDateTo ||
      !!dt.filters.establishmentId ||
      !!dt.filters.subjectId ||
      !!dt.filters.levelId ||
      !!dt.filters.recurrenceType,
    [dt.filters, defaultFilters],
  );

  const clearFilters = React.useCallback(() => {
    dt.setFilters(defaultFilters);
    dt.setCurrentPage(1);
  }, [dt, defaultFilters]);

  const cancelMutation = useMutation({
    mutationFn: cancelSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setCancelId(null);
      toast.success('Séance annulée avec succès !');
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation de la séance");
    },
  });

  const { data: attendanceSession } = useQuery({
    queryKey: ['session', attendanceSessionId],
    queryFn: () => getSession(attendanceSessionId ?? ''),
    enabled: !!attendanceSessionId,
  });

  const handleCancelClick = React.useCallback((id: string) => setCancelId(id), []);

  const handleManageAttendance = React.useCallback((id: string) => {
    setAttendanceSessionId(id);
  }, []);

  const handleAttendanceSuccess = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    if (expandedRowId) {
      queryClient.invalidateQueries({ queryKey: ['session', expandedRowId] });
    }
  }, [queryClient, expandedRowId]);

  const sessionToCancel = React.useMemo(
    () => data.find((s) => s.id === cancelId),
    [data, cancelId],
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

  const setDateRange = React.useCallback(
    (range: SessionFilters['dateRange']) => {
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

  const setLevel = React.useCallback(
    (id: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, levelId: id }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setSearch = React.useCallback(
    (value: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, search: value }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const setRecurrenceType = React.useCallback(
    (type: string | undefined) => {
      dt.setFilters((prev) => ({ ...prev, recurrenceType: type }));
      dt.setCurrentPage(1);
    },
    [dt],
  );

  const customFilterRender = React.useCallback(
    () => (
      <SessionFiltersContent
        filters={dt.filters}
        allowedFilterIds={dt.allowedFilterIds}
        visibleFilterIds={dt.visibleFilterIds}
        onToggleType={toggleTypeFilter}
        onToggleStatus={toggleStatusFilter}
        onSetDateRange={setDateRange}
        onSetCustomDateRange={setCustomDateRange}
        onSetEstablishment={setEstablishment}
        onSetSubject={setSubject}
        onSetLevel={setLevel}
        onSetSearch={setSearch}
        onSetRecurrenceType={setRecurrenceType}
      />
    ),
    [
      dt.filters,
      dt.allowedFilterIds,
      dt.visibleFilterIds,
      toggleTypeFilter,
      toggleStatusFilter,
      setDateRange,
      setCustomDateRange,
      setEstablishment,
      setSubject,
      setLevel,
      setSearch,
      setRecurrenceType,
    ],
  );

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: customFilterRender,
      },
    ],
    [customFilterRender],
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
      itemLabel="séances"
      onPageChange={dt.setCurrentPage}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      expandedColSpan={5}
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
              icon={isExporting ? undefined : Download}
              onClick={handleExportExcel}
              disabled={isExporting || isEmptyForExport}
              tooltipText={
                isEmptyForExport && !isExporting
                  ? 'Aucune séance à exporter avec les filtres actuels.'
                  : 'Exporter la liste des séances en Excel'
              }
            >
              {isExporting && <Spinner size="sm" />}
            </Button>
          )}

          {showCreateButton && onCreateSession && (
            <Button
              preset="toolbar-create"
              tooltipText="Planification des séances"
              onClick={() => {
                onCloseDetails?.();
                onCreateSession();
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
            resultLabel="séance(s)"
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
          <th>Date &amp; Horaire</th>
          <th>Type</th>
          <th>Établissement</th>
          <th>Statut</th>
          <th className="w-28 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(session) => (
        <SessionRow
          session={session}
          onView={onToggleRow ? () => onToggleRow(session.id) : undefined}
          onEdit={onEditSession}
          onCancel={handleCancelClick}
          onManageAttendance={
            !pageActions || pageActions.canManageAttendance ? handleManageAttendance : undefined
          }
          pageActions={pageActions}
        />
      )}
      expandedRowId={dt.expandedRowId}
      renderExpandedRow={(session) => <DetailsViewContent data={session} type="session" />}
      expandedRowRef={dt.expandedRowRef}
      expandedCollapseRef={dt.expandedCollapseRef}
      renderCard={(session) => (
        <SessionCard
          session={session}
          onView={onToggleRow ? () => onToggleRow(session.id) : undefined}
          onEdit={onEditSession}
          onCancel={handleCancelClick}
          onManageAttendance={
            !pageActions || pageActions.canManageAttendance ? handleManageAttendance : undefined
          }
          pageActions={pageActions}
        />
      )}
      emptyIcon={Calendar}
      emptyText="Aucune séance trouvée"
      title="Séances"
      isSection={isSection}
      expandedItem={data.find((s) => s.id === expandedRowId) ?? expandedSessionData ?? null}
      onCloseDetails={onCloseDetails}
      renderDetailsContent={(session) => <DetailsViewContent data={session} type="session" />}
      modals={
        <>
          <DeleteModal
            open={!!cancelId}
            onClose={() => setCancelId(null)}
            onConfirm={() => {
              if (cancelId) cancelMutation.mutate(cancelId);
            }}
            itemName={
              sessionToCancel
                ? `${SESSION_TYPE_CONFIG[sessionToCancel.type]?.label || sessionToCancel.type} - ${sessionToCancel.sessionDate.toLocaleDateString('fr-FR')}`
                : undefined
            }
            title="Annuler la séance"
            description="Êtes-vous sûr de vouloir annuler cette séance ?"
            confirmText="Annuler la séance"
            isLoading={cancelMutation.isPending}
          />

          {attendanceSessionId &&
            (attendanceSession ? (
              <AttendanceModal
                open={true}
                onClose={() => setAttendanceSessionId(null)}
                session={attendanceSession}
                onSuccess={handleAttendanceSuccess}
              />
            ) : (
              <BaseModal
                open={true}
                onClose={() => setAttendanceSessionId(null)}
                size="md"
                header={{
                  icon: UserCheck,
                  iconSize: 'md',
                  iconColor: 'var(--color-2-nuance-1)',
                  iconBgColor: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                  title: 'Gestion des présences',
                  titleSize: 'lg',
                  titleWeight: 'semibold',
                  titleColor: 'var(--color-1-nuance-1)',
                }}
              >
                <div className="flex items-center justify-center py-8">
                  <Spinner size="lg" label="Chargement des participants..." />
                </div>
              </BaseModal>
            ))}
        </>
      }
    />
  );
};
