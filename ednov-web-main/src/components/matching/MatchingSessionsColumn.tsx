import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { SessionMatchingCollapse } from './SessionMatchingCollapse';
import { ScrollBar } from '@/components/ui/scroll-bar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/forms/Button';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { SessionFiltersContent } from '@/components/sessions/SessionFilters';
import { FilterConfigurePanel } from '@/components/common/DataTable/FilterConfigurePanel';
import { getSessions, SessionListItem } from '@/services/sessions.service';
import { useFilterVisibility } from '@/hooks/useFilterVisibility';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SESSION_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type SessionFilters,
  type FilterGroupId,
} from '@/components/sessions/session-configs';
import type { UserWithProfile } from '@/types/user.types';
import type { SessionForMatching } from '@/types/matching-ui.types';

// Type partagé avec ConfigureMatchingView (utilisé pour le DnD)
export type SessionHandlers = {
  handleAddTutor: (user: UserWithProfile) => void;
  handleAddStudent: (user: UserWithProfile) => void;
  handleMatchStudentToTutor: (studentId: string, tutorId: string) => void;
  handleUnmatchStudent: (studentId: string, tutorId: string) => void;
  getSpecificMatches: () => Array<{ studentId: string; tutorId: string }>;
  getTempTutors: () => UserWithProfile[];
  getTempStudents: () => UserWithProfile[];
};

interface MatchingSessionsColumnProps {
  selectedDates?: Date[];
  /** Popule le sessionHandlersRef du parent (nécessaire pour le DnD) */
  onRegisterSessionHandlers: (sessionId: string, handlers: SessionHandlers) => void;
  /** Notifie le parent de la séance actuellement ouverte (null si aucune) */
  onSessionToggled: (expandedSessionId: string | null) => void;
  /** Notifie le parent qu'un participant a changé → recalcul excludedIds */
  onParticipantsChange: () => void;
  /** Demande au parent d'afficher le formulaire de création de séance */
  onRequestCreateSession: () => void;
  /** Synchronise les dates sélectionnées dans le calendrier parent */
  onSetSelectedDates?: (dates: Date[]) => void;
  className?: string;
}

export const MatchingSessionsColumn: React.FC<MatchingSessionsColumnProps> = ({
  selectedDates = [],
  onRegisterSessionHandlers,
  onSessionToggled,
  onParticipantsChange,
  onRequestCreateSession,
  onSetSelectedDates,
  className,
}) => {
  // ── Pagination ────────────────────────────────────────────────────────────
  const [sessionsPage, setSessionsPage] = React.useState(1);
  const sessionsPerPage = 10;

  // ── Ordre de tri ──────────────────────────────────────────────────────────
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = React.useState<SessionFilters>({
    ...DEFAULT_SESSION_FILTERS,
    dateRange: 'today',
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [showConfigure, setShowConfigure] = React.useState(false);

  // ── RBAC + Préférences ────────────────────────────────────────────────────
  const {
    visibleFilterIds,
    allowedFilterIds,
    filterVisibility,
    handleToggleFilterVisibility,
    isSavingFilterVisibility,
  } = useFilterVisibility<FilterGroupId>({
    preferencesName: 'sessions-matching',
    elementsName: 'sessions',
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
  });

  const configureContent = (
    <FilterConfigurePanel
      allowedFilterIds={allowedFilterIds}
      filterVisibility={filterVisibility}
      filterGroupLabels={FILTER_GROUP_LABELS}
      onToggle={handleToggleFilterVisibility}
      isSaving={isSavingFilterVisibility}
    />
  );

  // ── Synchronisation calendrier ↔ filtres ─────────────────────────────────
  // Ref pour éviter la boucle : quand on met à jour le calendrier depuis le filtre,
  // on ignore le prochain changement de selectedDates
  const isProgrammaticCalendarUpdate = React.useRef(false);

  // Clé stable pour éviter les re-renders inutiles sur les dates du calendrier
  const selectedDatesKey = React.useMemo(() => {
    if (!selectedDates || selectedDates.length === 0) return '';
    return selectedDates
      .map((d) => d.getTime())
      .sort((a, b) => a - b)
      .join(',');
  }, [selectedDates]);

  // Calendrier → filtre : quand l'utilisateur sélectionne des dates dans le calendrier
  React.useEffect(() => {
    if (isProgrammaticCalendarUpdate.current) {
      isProgrammaticCalendarUpdate.current = false;
      return;
    }
    if (selectedDates && selectedDates.length > 0) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      // Si une seule date sélectionnée = aujourd'hui → activer le filtre "today"
      const isOnlyToday =
        selectedDates.length === 1 &&
        new Date(
          selectedDates[0].getFullYear(),
          selectedDates[0].getMonth(),
          selectedDates[0].getDate(),
        ).getTime() === todayStart;

      if (isOnlyToday) {
        setFilters((prev) => ({
          ...prev,
          dateRange: 'today',
          customDateFrom: undefined,
          customDateTo: undefined,
        }));
        return;
      }

      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const dateFrom = new Date(sortedDates[0]);
      dateFrom.setHours(0, 0, 0, 0);
      const lastDate = sortedDates.at(-1);
      const dateTo = new Date(lastDate);
      dateTo.setHours(23, 59, 59, 999);
      setFilters((prev) => ({
        ...prev,
        customDateFrom: dateFrom,
        customDateTo: dateTo,
        dateRange: 'all',
      }));
    }
  }, [selectedDatesKey]);

  // Sync initiale : au montage, sélectionner aujourd'hui dans le calendrier
  React.useEffect(() => {
    isProgrammaticCalendarUpdate.current = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onSetSelectedDates?.([today]);
  }, []);

  // ── Expansion state ───────────────────────────────────────────────────────
  const [expandedSessions, setExpandedSessions] = React.useState<Set<string>>(new Set());

  // Notifier le parent dès que la séance ouverte change
  React.useEffect(() => {
    const nextId = expandedSessions.size === 1 ? Array.from(expandedSessions)[0] : null;
    onSessionToggled(nextId ?? null);
  }, [expandedSessions, onSessionToggled]);

  const toggleSession = React.useCallback((sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set<string>();
      if (!prev.has(sessionId)) {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }, []);

  // ── Fetch sessions ────────────────────────────────────────────────────────
  const { data: sessionsResponse, isLoading: sessionsLoading } = useQuery({
    queryKey: [
      'sessions-matching',
      {
        page: sessionsPage,
        pageSize: sessionsPerPage,
        dateRange: filters.dateRange,
        types: filters.types,
        statuses: filters.statuses,
        establishmentId: filters.establishmentId,
        subjectId: filters.subjectId,
        levelId: filters.levelId,
        search: filters.search,
        customDateFrom: filters.customDateFrom?.getTime(),
        customDateTo: filters.customDateTo?.getTime(),
        sortOrder,
      },
    ],
    queryFn: async () => {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (filters.customDateFrom || filters.customDateTo) {
        dateFrom = filters.customDateFrom;
        dateTo = filters.customDateTo;
      } else if (filters.dateRange !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filters.dateRange) {
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
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        }
      }

      return await getSessions({
        statuses: ['PLANNED', 'IN_PROGRESS'],
        types: filters.types.length > 0 ? filters.types : undefined,
        establishmentId: filters.establishmentId,
        subjectId: filters.subjectId,
        levelId: filters.levelId,
        search: filters.search,
        sortBy: 'sessionDate',
        sortOrder,
        page: sessionsPage,
        pageSize: sessionsPerPage,
        dateFrom,
        dateTo,
      });
    },
  });

  const sessionsData = sessionsResponse?.data || [];
  const totalSessions = sessionsResponse?.total || 0;

  // ── Helpers pour transformation (réduction nesting) ──────────────────────
  const transformUserProfile = React.useCallback(
    (profile: any) => ({
      subjects: profile.subjects ? [profile.subjects] : null,
      availability: null,
      level: profile.level || null,
    }),
    [],
  );

  const transformUserWithProfile = React.useCallback(
    (user: any, role: string): UserWithProfile => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || null,
      companyId: '',
      firebaseUid: '',
      displayName:
        role === 'student'
          ? user.displayName || null
          : `${user.firstName} ${user.lastName}`.trim() || user.displayName || null,
      photoUrl: null,
      phone: null,
      status: 'active' as const,
      userProfiles: user.userProfiles?.map(transformUserProfile) || [],
      userRoles: [],
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    }),
    [transformUserProfile],
  );

  const transformParticipant = React.useCallback(
    (p: any) => ({
      ...p,
      user: p.user ? transformUserWithProfile(p.user, p.role) : undefined,
    }),
    [transformUserWithProfile],
  );

  const transformStudentTutorPair = React.useCallback(
    (pair: any) => ({
      id: pair.id,
      sessionId: pair.sessionId,
      studentUserId: pair.studentUserId,
      tutorUserId: pair.tutorUserId,
      assignmentSource: pair.assignmentSource as
        | 'manual'
        | 'auto_binome_coeur'
        | 'auto_history'
        | 'auto_balanced',
    }),
    [],
  );

  const convertedSessions: SessionForMatching[] = React.useMemo(() => {
    return sessionsData.map((session: SessionListItem) => ({
      ...session,
      participants: session.participants?.map(transformParticipant),
      studentTutorPairs: session.studentTutorPairs?.map(transformStudentTutorPair),
    }));
  }, [sessionsData, transformParticipant, transformStudentTutorPair]);

  const totalSessionsPages = Math.ceil(totalSessions / sessionsPerPage);
  const canGoToPreviousPage = sessionsPage > 1;
  const canGoToNextPage = sessionsPage < totalSessionsPages;

  // ── Handlers filtres ──────────────────────────────────────────────────────
  const toggleTypeFilter = React.useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
    setSessionsPage(1);
  }, []);

  const toggleStatusFilter = React.useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
    setSessionsPage(1);
  }, []);

  const setDateRange = React.useCallback(
    (range: SessionFilters['dateRange']) => {
      setFilters((prev) => ({
        ...prev,
        dateRange: range,
        customDateFrom: undefined,
        customDateTo: undefined,
      }));
      // Filtre → calendrier : mettre à jour visuellement sans déclencher la boucle
      isProgrammaticCalendarUpdate.current = true;
      if (range === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        onSetSelectedDates?.([today]);
      } else {
        // week/month/all : pas de jours individuels à sélectionner → vider le calendrier
        onSetSelectedDates?.([]);
      }
      setSessionsPage(1);
    },
    [onSetSelectedDates],
  );

  const setCustomDateRange = React.useCallback((from: Date | undefined, to: Date | undefined) => {
    setFilters((prev) => ({
      ...prev,
      customDateFrom: from,
      customDateTo: to,
      // Ne mettre 'all' que si on définit vraiment des dates custom
      ...(from || to ? { dateRange: 'all' as const } : {}),
    }));
    setSessionsPage(1);
  }, []);

  const setEstablishment = React.useCallback((id: string | undefined) => {
    setFilters((prev) => ({ ...prev, establishmentId: id }));
    setSessionsPage(1);
  }, []);

  const setSubject = React.useCallback((id: string | undefined) => {
    setFilters((prev) => ({ ...prev, subjectId: id }));
    setSessionsPage(1);
  }, []);

  const setLevel = React.useCallback((id: string | undefined) => {
    setFilters((prev) => ({ ...prev, levelId: id }));
    setSessionsPage(1);
  }, []);

  const setSearch = React.useCallback((value: string | undefined) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setSessionsPage(1);
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters({ ...DEFAULT_SESSION_FILTERS, dateRange: 'today' });
    isProgrammaticCalendarUpdate.current = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onSetSelectedDates?.([today]);
    setSessionsPage(1);
  }, [onSetSelectedDates]);

  const renderSessionFilters = React.useCallback(
    () => (
      <SessionFiltersContent
        filters={filters}
        allowedFilterIds={allowedFilterIds}
        visibleFilterIds={visibleFilterIds}
        onToggleType={toggleTypeFilter}
        onToggleStatus={toggleStatusFilter}
        onSetDateRange={setDateRange}
        onSetCustomDateRange={setCustomDateRange}
        onSetEstablishment={setEstablishment}
        onSetSubject={setSubject}
        onSetLevel={setLevel}
        onSetSearch={setSearch}
      />
    ),
    [
      filters,
      allowedFilterIds,
      visibleFilterIds,
      toggleTypeFilter,
      toggleStatusFilter,
      setDateRange,
      setCustomDateRange,
      setEstablishment,
      setSubject,
      setLevel,
      setSearch,
    ],
  );

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'sessions-filters',
        label: 'Filtres des séances',
        type: 'custom' as const,
        customRender: renderSessionFilters,
      },
    ],
    [renderSessionFilters],
  );

  const hasActiveFilters = React.useMemo(
    () =>
      filters.types.length > 0 ||
      filters.dateRange !== 'all' ||
      !!filters.customDateFrom ||
      !!filters.customDateTo ||
      !!filters.establishmentId ||
      !!filters.subjectId ||
      !!filters.levelId ||
      !!filters.search,
    [filters],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={cn('matching-column matching-column-center', className)}>
      {/* Header */}
      <div className="matching-column-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                background: 'color-mix(in srgb, var(--color-1-nuance-1) 10%, transparent)',
                borderColor: 'var(--color-1-nuance-1)',
              }}
            >
              <Calendar className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-1-nuance-1)' }}>
                Séances
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalSessions} {totalSessions > 1 ? 'séances' : 'séance'}
                {totalSessionsPages > 1 && ` • Page ${sessionsPage}/${totalSessionsPages}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              preset="toolbar-create"
              tooltipText="Planification des séances"
              onClick={onRequestCreateSession}
            />
            <Button
              preset="toolbar-filter"
              tooltipText="Filtrer les séances"
              showBadge={hasActiveFilters}
              onClick={() => setShowFilters(true)}
            />
            <Button
              preset="toolbar-sort"
              tooltipText={
                sortOrder === 'desc'
                  ? 'Trier du plus ancien au plus récent'
                  : 'Trier du plus récent au plus ancien'
              }
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              disabled={sessionsLoading}
            />
            <Button
              preset="column-pagination-prev"
              onClick={() => setSessionsPage((p) => p - 1)}
              disabled={!canGoToPreviousPage || sessionsLoading}
            />
            <Button
              preset="column-pagination-next"
              onClick={() => setSessionsPage((p) => p + 1)}
              disabled={!canGoToNextPage || sessionsLoading}
            />
          </div>
        </div>
      </div>

      {/* Liste des séances */}
      <ScrollBar className="matching-sessions-list">
        {sessionsLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" label="Chargement des séances..." />
          </div>
        )}

        {!sessionsLoading && convertedSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border"
              style={{
                background: 'color-mix(in srgb, var(--color-1-nuance-3) 10%, transparent)',
                borderColor: 'var(--color-1-nuance-3)',
              }}
            >
              <Calendar className="w-6 h-6" style={{ color: 'var(--color-1-nuance-3)' }} />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Aucune séance planifiée ou en cours
            </p>
          </div>
        )}

        {!sessionsLoading &&
          convertedSessions.map((session) => (
            <SessionMatchingCollapse
              key={session.id}
              session={session}
              isExpanded={expandedSessions.has(session.id)}
              onToggle={() => toggleSession(session.id)}
              onRegisterHandlers={onRegisterSessionHandlers}
              onParticipantsChange={onParticipantsChange}
            />
          ))}
      </ScrollBar>

      {/* Modal de filtres */}
      <DataTableFilters
        show={showFilters}
        mode="modal"
        onClose={() => {
          setShowFilters(false);
          setShowConfigure(false);
        }}
        hasActiveFilters={hasActiveFilters}
        filterGroups={filterGroups}
        onClearFilters={clearFilters}
        resultCount={totalSessions}
        resultLabel="séances"
        onToggleConfigure={() => setShowConfigure((v) => !v)}
        showConfigure={showConfigure}
        configureContent={configureContent}
      />
    </div>
  );
};
