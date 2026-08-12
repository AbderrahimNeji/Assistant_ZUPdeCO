import * as React from 'react';
import { HeartHandshake, Settings, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import { SlidingWeekCalendar } from '@/components/calendar/SlidingWeekCalendar';
import { ConfigureMatchingView } from '../../components/matching/ConfigureMatchingView';
import { PairsDataTable } from '../../components/matching/PairsDataTable';
import { usePageActions } from '@/hooks/usePageActions';
import { ManagementPage } from '@/components/common/ManagementPage';
import { useAssistantLauncher, AskCopilotButton } from '@/features/copilot';

type ActiveTab = 'configure' | 'list';

/** Masque l’onglet « Configurer Matching » (le composant reste montable via code / feature flag). */
const SHOW_CONFIGURE_MATCHING_TAB = false;

/** Masque le filtre dates (calendrier semaine) dans l’en-tête de la page matching. */
const SHOW_MATCHING_DATE_FILTER = false;

const MATCHING_TAB_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'configure',
    label: 'Configurer Matching',
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: 'list',
    label: 'Liste des binômes',
    icon: <List className="h-4 w-4" />,
  },
];

export const MatchingManagementPage: React.FC = () => {
  const { canDeleteRow } = usePageActions('matching');
  const { canExportCsv } = usePageActions('pairs');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>(
    SHOW_CONFIGURE_MATCHING_TAB ? 'configure' : 'list',
  );
  const [selectedDates, setSelectedDates] = React.useState<Date[]>([]);
  const [expandedPairId, setExpandedPairId] = React.useState<string | null>(null);
  const { setSelection, setEntity, clearSelection, setFilters, patchContext } =
    useAssistantLauncher();

  const visibleTabItems = React.useMemo(
    () =>
      SHOW_CONFIGURE_MATCHING_TAB
        ? MATCHING_TAB_ITEMS
        : MATCHING_TAB_ITEMS.filter((item) => item.id !== 'configure'),
    [],
  );

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    const viewId = searchParams.get('view');

    if (tab === 'configure' && !SHOW_CONFIGURE_MATCHING_TAB) {
      setActiveTab('list');
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'list');
      setSearchParams(next, { replace: true });
    } else if (tab && (tab === 'configure' || tab === 'list')) {
      setActiveTab(tab);
    }

    const effectiveTab = tab === 'configure' && !SHOW_CONFIGURE_MATCHING_TAB ? 'list' : tab;

    if (viewId && effectiveTab === 'list') {
      setExpandedPairId(viewId);
    } else if (!viewId) {
      setExpandedPairId(null);
    }
  }, [searchParams]);

  const handleFocusedPairChange = React.useCallback(
    (pair: import('@/types/matching.types').SessionStudentTutorPair | null) => {
      if (!pair) {
        clearSelection();
        setEntity('matching', undefined);
        setEntity('student', undefined);
        setEntity('tutor', undefined);
        setEntity('session', undefined);
        return;
      }

      const studentLabel =
        pair.studentUser?.displayName?.trim() ||
        `${pair.studentUser?.firstName ?? ''} ${pair.studentUser?.lastName ?? ''}`.trim() ||
        'Élève';
      const tutorLabel =
        `${pair.tutorUser?.firstName ?? ''} ${pair.tutorUser?.lastName ?? ''}`.trim() ||
        pair.tutorUser?.displayName?.trim() ||
        'Tuteur';
      const sessionDateRaw = pair.session?.sessionDate
        ? String(pair.session.sessionDate)
        : '';
      const sessionDateIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(sessionDateRaw);
      const sessionLabel = sessionDateIso
        ? `Séance ${sessionDateIso[3]}/${sessionDateIso[2]}`
        : sessionDateRaw
          ? `Séance ${sessionDateRaw.slice(0, 10)}`
          : 'Séance';

      const matchingRef = {
        type: 'matching' as const,
        id: pair.id,
        label: `${studentLabel} ↔ ${tutorLabel}`,
      };
      const studentRef = pair.studentUserId
        ? { type: 'student' as const, id: pair.studentUserId, label: studentLabel }
        : undefined;
      const tutorRef = pair.tutorUserId
        ? { type: 'tutor' as const, id: pair.tutorUserId, label: tutorLabel }
        : undefined;
      const sessionRef = pair.sessionId
        ? { type: 'session' as const, id: pair.sessionId, label: sessionLabel }
        : undefined;

      const entities = [matchingRef, studentRef, tutorRef, sessionRef].filter(
        Boolean,
      ) as Array<{ type: string; id: string; label: string }>;

      setSelection(matchingRef, entities);
      setEntity('matching', matchingRef);
      setEntity('student', studentRef);
      setEntity('tutor', tutorRef);
      setEntity('session', sessionRef);
    },
    [clearSelection, setEntity, setSelection],
  );

  React.useEffect(() => {
    if (!selectedDates.length) {
      setFilters(undefined);
      patchContext({ date: undefined });
      return;
    }
    const start = selectedDates[0]?.toISOString().slice(0, 10);
    const end = selectedDates[selectedDates.length - 1]
      ?.toISOString()
      .slice(0, 10);
    setFilters({ dateStart: start, dateEnd: end });
    patchContext({
      date: {
        start,
        end,
        label: start && end ? `${start} → ${end}` : start,
      },
    });
  }, [selectedDates, setFilters, patchContext]);

  const handleNavigateToConfig = () => {
    setActiveTab('configure');
  };

  const handleTogglePair = React.useCallback(
    (id: string) => {
      if (expandedPairId === id) {
        setExpandedPairId(null);
        searchParams.delete('view');
        setSearchParams(searchParams, { replace: true });
      } else {
        setExpandedPairId(id);
        searchParams.set('view', id);
        setSearchParams(searchParams, { replace: true });
      }
    },
    [expandedPairId, searchParams, setSearchParams],
  );

  const handleClosePairDetails = React.useCallback(() => {
    setExpandedPairId(null);
    searchParams.delete('view');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <ManagementPage
      headerContent={
        <div className="management-page-header-with-tabs-bar">
          <div
            className="management-page-header"
            style={SHOW_MATCHING_DATE_FILTER ? { position: 'relative' } : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border-2"
                style={{
                  background: 'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
                  borderColor: 'var(--color-2-nuance-1)',
                }}
              >
                <HeartHandshake className="w-6 h-6" style={{ color: 'var(--color-2-nuance-1)' }} />
              </div>
              <div>
                <h1 className="management-page-title">Gestion des binômes</h1>
                <p className="management-page-subtitle">
                  Gérez les binômes élève–tuteur par séance
                </p>
              </div>
              {expandedPairId && (
                <AskCopilotButton prompt="Why isn’t this student matched? Who is his tutor?" />
              )}
            </div>

            {SHOW_MATCHING_DATE_FILTER && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <SlidingWeekCalendar
                  selectedDates={selectedDates}
                  onDatesChange={setSelectedDates}
                />
              </div>
            )}
          </div>

          {visibleTabItems.length > 1 && (
            <Tabs
              items={visibleTabItems}
              activeTab={activeTab}
              onTabChange={(tabId: ActiveTab) => {
                if (tabId === 'configure' && !SHOW_CONFIGURE_MATCHING_TAB) return;
                setActiveTab(tabId);
              }}
              variant="default"
              size="md"
              ariaLabel="Navigation matching"
            />
          )}
        </div>
      }
    >
      {activeTab === 'configure' && (
        <ConfigureMatchingView
          selectedDates={selectedDates}
          onSetSelectedDates={setSelectedDates}
        />
      )}
      {activeTab === 'list' && (
        <PairsDataTable
          onNavigateToConfig={handleNavigateToConfig}
          expandedRowId={expandedPairId}
          onToggleRow={handleTogglePair}
          onCloseDetails={handleClosePairDetails}
          onFocusedPairChange={handleFocusedPairChange}
          pageActions={{ canDeleteRow, canExportCsv }}
        />
      )}
    </ManagementPage>
  );
};
