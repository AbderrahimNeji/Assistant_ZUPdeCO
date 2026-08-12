import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { ProgramsDataTable } from '@/components/programs/ProgramsDataTable';
import { CreateProgramView } from '@/components/programs/CreateProgramView';
import { EditProgramView } from '@/components/programs/EditProgramView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { useAssistantLauncher, AskCopilotButton } from '@/features/copilot';

export const ProgramsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('programs');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editProgramId, setEditProgramId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('programs-management');
  const { setSelection, setEntity, clearSelection } = useAssistantLauncher();

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditProgramId(editId);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditProgramId(null);
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditProgramId(null);
      closeRow();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  React.useEffect(() => {
    const focusedId = editProgramId || openRowId;
    if (!focusedId) {
      clearSelection();
      setEntity('program', undefined);
      return;
    }

    let cancelled = false;

    const resolveFromCache = (): string => {
      const lists = queryClient.getQueriesData<{
        data?: Array<{
          id?: string;
          label?: string | null;
          name?: string | null;
        }>;
        id?: string;
        label?: string | null;
        name?: string | null;
      }>({ queryKey: ['programs'] });

      for (const [, payload] of lists) {
        if (!payload) continue;
        const hit = payload.data?.find((p) => p.id === focusedId);
        if (hit) {
          return hit.label?.trim() || hit.name?.trim() || 'Programme sélectionné';
        }
        if (payload.id === focusedId) {
          return (
            payload.label?.trim() ||
            payload.name?.trim() ||
            'Programme sélectionné'
          );
        }
      }
      return 'Programme sélectionné';
    };

    const apply = (label: string) => {
      if (cancelled) return;
      const ref = { type: 'program' as const, id: focusedId, label };
      setSelection(ref);
      setEntity('program', ref);
    };

    apply(resolveFromCache());

    void (async () => {
      try {
        const { getProgram } = await import('@/services/academic.service');
        const program = await getProgram(focusedId);
        apply(
          program.label?.trim() || program.name?.trim() || 'Programme sélectionné',
        );
      } catch {
        // Keep cache/fallback label — never invent.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editProgramId, openRowId, setSelection, setEntity, clearSelection, queryClient]);

  const handleEditProgram = (id: string) => {
    setEditProgramId(id);
    closeRow();
  };

  return (
    <ManagementPage
      title="Gestion des Programmes"
      subtitle="Créez, modifiez et gérez tous vos programmes académiques"
      actions={
        <div className="flex items-center gap-3">
          {(editProgramId || openRowId) && (
            <AskCopilotButton prompt="Summarize this program and who is eligible." />
          )}
          {canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditProgramId(null);
              closeRow();
            }}
          >
            Créer un programme
          </Button>
          ) : null}
        </div>
      }
    >
      <ProgramsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditProgram={handleEditProgram}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={() => setCreateFormOpen(false)}>
        <CreateProgramView
          onClose={() => setCreateFormOpen(false)}
          onSuccess={() => {
            setCreateFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ['programs'] });
          }}
        />
      </SlidePanel>

      <SlidePanel isOpen={!!editProgramId} onClose={() => setEditProgramId(null)}>
        {editProgramId && (
          <EditProgramView
            programId={editProgramId}
            onClose={() => setEditProgramId(null)}
            onSuccess={() => {
              setEditProgramId(null);
              queryClient.invalidateQueries({ queryKey: ['programs'] });
            }}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
