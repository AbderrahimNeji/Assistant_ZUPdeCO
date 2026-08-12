import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { CollapseReplaceWrapper } from '@/components/common/CollapseReplaceWrapper';
import { SessionsDataTable } from '@/components/sessions/SessionsDataTable';
import { CreateSessionView } from '@/components/sessions/CreateSessionView';
import { EditSessionView } from '@/components/sessions/EditSessionView';
import { SelectPlanificationTypeModal } from '@/components/sessions/SelectPlanificationTypeModal';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { OPEN_CREATE_SESSION_EVENT, useAssistantLauncher, AskCopilotButton } from '@/features/copilot';
import { SESSION_TYPE_CONFIG } from '@/components/sessions/session-configs';
import type { PlanificationType } from '@/types/session.types';

type SessionFocusHit = {
  id?: string;
  sessionDate?: Date | string;
  type?: string;
  establishmentName?: string | null;
  establishment?: { name?: string };
};

function formatSessionDate(value?: Date | string): string {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString('fr-FR');
  }
  const raw = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('fr-FR');
}

function formatSessionFocusLabel(session: SessionFocusHit): string {
  const typeLabel = session.type
    ? SESSION_TYPE_CONFIG[session.type]?.label || session.type
    : 'Séance';
  const date = formatSessionDate(session.sessionDate);
  const est = session.establishmentName ?? session.establishment?.name;
  return [typeLabel, date, est].filter(Boolean).join(' · ') || 'Séance sélectionnée';
}

type ActiveForm = 'create' | 'edit' | null;

export const SessionsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canManageAttendance, canExportCsv } = usePageActions('sessions');
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editSessionId, setEditSessionId] = React.useState<string | null>(null);
  const [planificationType, setPlanificationType] = React.useState<PlanificationType | null>(null);
  const [planificationModalOpen, setPlanificationModalOpen] = React.useState(false);
  const { viewMode, setViewMode } = useViewMode('sessions-management');
  const { openRowId, openRow, closeRow } = useDetailsView();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const { openAssistant, setSelection, setEntity, clearSelection } = useAssistantLauncher();

  const openCreateSessionDialog = React.useCallback(() => {
    setPlanificationModalOpen(true);
    setEditSessionId(null);
    closeRow();
  }, [closeRow]);

  React.useEffect(() => {
    const onOpenCreate = () => openCreateSessionDialog();
    window.addEventListener(OPEN_CREATE_SESSION_EVENT, onOpenCreate);
    return () => window.removeEventListener(OPEN_CREATE_SESSION_EVENT, onOpenCreate);
  }, [openCreateSessionDialog]);

  React.useEffect(() => {
    const viewId = searchParams.get('view');
    const editId = searchParams.get('edit');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditSessionId(editId);
      setActiveForm('edit');
      closeRow();
    } else if (viewId) {
      openRow(viewId);
      setActiveForm(null);
      setEditSessionId(null);
    } else if (shouldCreate) {
      setPlanificationModalOpen(true);
      setEditSessionId(null);
      closeRow();
    }
  }, [searchParams, closeRow, openRow]);

  React.useEffect(() => {
    const focusedId = editSessionId || openRowId;
    if (!focusedId) {
      clearSelection();
      setEntity('session', undefined);
      return;
    }

    let cancelled = false;

    const resolveFromCache = (): string => {
      const queries = queryClient.getQueriesData<{
        data?: SessionFocusHit[];
        id?: string;
        sessionDate?: Date | string;
        type?: string;
        establishmentName?: string | null;
        establishment?: { name?: string };
      }>({ queryKey: ['sessions'] });

      for (const [, payload] of queries) {
        if (!payload) continue;
        const hit = payload.data?.find((s) => s.id === focusedId);
        if (hit) return formatSessionFocusLabel(hit);
        if (payload.id === focusedId) return formatSessionFocusLabel(payload);
      }
      return 'Séance sélectionnée';
    };

    const apply = (label: string) => {
      if (cancelled) return;
      const ref = { type: 'session' as const, id: focusedId, label };
      setSelection(ref);
      setEntity('session', ref);
    };

    apply(resolveFromCache());

    void (async () => {
      try {
        const { getSession } = await import('@/services/sessions.service');
        const session = await getSession(focusedId);
        apply(formatSessionFocusLabel(session));
      } catch {
        // Keep cache/fallback label — never invent.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editSessionId, openRowId, setSelection, setEntity, clearSelection, queryClient]);

  const closeForm = () => {
    setActiveForm(null);
    setEditSessionId(null);
    setPlanificationType(null);
  };

  const handlePlanificationSelect = (type: PlanificationType) => {
    setPlanificationType(type);
    setPlanificationModalOpen(false);
    setActiveForm('create');
    setEditSessionId(null);
    closeRow();
  };

  const handleEditSession = (sessionId: string) => {
    setEditSessionId(sessionId);
    setActiveForm('edit');
    closeRow();
  };

  // Scroll to top when form opens (track previous value)
  const prevActiveFormRef = React.useRef(activeForm);
  React.useEffect(() => {
    if (prevActiveFormRef.current !== activeForm && activeForm !== null && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevActiveFormRef.current = activeForm;
  }, [activeForm]);

  const handleSessionFormSuccess = React.useCallback(() => {
    closeForm();
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [queryClient]);

  // Pas de useMemo ici : évite de remonter CreateSessionView/EditSessionView et perdre les participants
  // ajoutés via + pendant la saisie (même SessionParticipantsSection que le matching).
  const formContent =
    activeForm === 'create' && planificationType ? (
      <CreateSessionView
        key={`sessions-create-${planificationType}`}
        planificationType={planificationType}
        onClose={closeForm}
        onSuccess={handleSessionFormSuccess}
      />
    ) : activeForm === 'edit' && editSessionId ? (
      <EditSessionView
        key={`sessions-edit-${editSessionId}`}
        sessionId={editSessionId}
        onClose={closeForm}
        onSuccess={handleSessionFormSuccess}
      />
    ) : null;

  return (
    <ManagementPage
      title="Gestion des Séances"
      subtitle="Créez, modifiez et gérez toutes vos séances"
      contentRef={contentRef}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {(editSessionId || openRowId) && (
            <AskCopilotButton prompt="Summarize this session, list participants, and show attendance." />
          )}
          {canCreate ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  openCreateSessionDialog();
                  openAssistant({
                    prompt:
                      'Aide-moi à créer une séance : rappelle les étapes du formulaire Ednov.',
                    autoSend: true,
                  });
                }}
              >
                Créer une séance
              </Button>
              <Button
                preset="create-entity"
                onClick={openCreateSessionDialog}
              >
                Planification des séances
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <CollapseReplaceWrapper
        mode="replace"
        isOpen={activeForm !== null}
        onToggle={closeForm}
        collapsePosition="top"
        formContent={formContent}
      >
        <SessionsDataTable
          expandedRowId={openRowId}
          onToggleRow={openRow}
          onCloseDetails={closeRow}
          onEditSession={handleEditSession}
          enableFilters={true}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          pageActions={{
            canEditRow,
            canManageAttendance,
            canExportCsv,
          }}
        />
      </CollapseReplaceWrapper>
      <SelectPlanificationTypeModal
        open={planificationModalOpen}
        onClose={() => setPlanificationModalOpen(false)}
        onSelect={handlePlanificationSelect}
      />
    </ManagementPage>
  );
};
