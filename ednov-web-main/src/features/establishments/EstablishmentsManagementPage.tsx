import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { CollapseReplaceWrapper } from '@/components/common/CollapseReplaceWrapper';
import { EstablishmentsDataTable } from '@/components/establishments/EstablishmentsDataTable';
import { CreateEstablishmentView } from '@/components/establishments/CreateEstablishmentView';
import { EditEstablishmentView } from '@/components/establishments/EditEstablishmentView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import type { Establishment } from '@/types/establishment.types';
import { useAssistantLauncher, AskCopilotButton } from '@/features/copilot';

type ActiveForm = 'create' | 'edit' | null;

export const EstablishmentsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('establishments');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editEstablishmentId, setEditEstablishmentId] = React.useState<string | null>(null);
  const { viewMode, setViewMode } = useViewMode('establishments-management');
  const { openRowId, openRow, closeRow } = useDetailsView();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const { setSelection, setEntity, clearSelection } = useAssistantLauncher();

  React.useEffect(() => {
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (viewId) {
      openRow(viewId);
      setActiveForm(null);
      setEditEstablishmentId(null);
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }

    if (shouldCreate) {
      setActiveForm('create');
      setEditEstablishmentId(null);
      closeRow();
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  React.useEffect(() => {
    const focusedId = editEstablishmentId || openRowId;
    if (!focusedId) {
      clearSelection();
      setEntity('establishment', undefined);
      return;
    }

    let cancelled = false;

    const resolveFromCache = (): string => {
      const lists = queryClient.getQueriesData<{
        data?: Array<{
          id?: string;
          name?: string | null;
          officialName?: string | null;
        }>;
        id?: string;
        name?: string | null;
        officialName?: string | null;
      }>({ queryKey: ['establishments'] });

      for (const [, payload] of lists) {
        if (!payload) continue;
        const hit = payload.data?.find((e) => e.id === focusedId);
        if (hit) {
          return hit.name?.trim() || hit.officialName?.trim() || 'Établissement sélectionné';
        }
        if (payload.id === focusedId) {
          return (
            payload.name?.trim() ||
            payload.officialName?.trim() ||
            'Établissement sélectionné'
          );
        }
      }
      return 'Établissement sélectionné';
    };

    const apply = (label: string) => {
      if (cancelled) return;
      const ref = { type: 'establishment' as const, id: focusedId, label };
      setSelection(ref);
      setEntity('establishment', ref);
    };

    apply(resolveFromCache());

    void (async () => {
      try {
        const { getEstablishment } = await import(
          '@/services/establishments.service'
        );
        const establishment = await getEstablishment(focusedId);
        apply(
          establishment.name?.trim() ||
            establishment.officialName?.trim() ||
            'Établissement sélectionné',
        );
      } catch {
        // Keep cache/fallback label — never invent.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    editEstablishmentId,
    openRowId,
    setSelection,
    setEntity,
    clearSelection,
    queryClient,
  ]);

  const handleEditEstablishment = (establishment: Establishment) => {
    setEditEstablishmentId(establishment.id);
    setActiveForm('edit');
    closeRow();
  };

  const closeForm = () => {
    setActiveForm(null);
    setEditEstablishmentId(null);
  };

  const handleSuccess = () => {
    closeForm();
    queryClient.invalidateQueries({ queryKey: ['establishments'], exact: true });
    window.location.reload();
  };

  const formContent = React.useMemo(() => {
    if (activeForm === 'create') {
      return <CreateEstablishmentView onClose={closeForm} onSuccess={handleSuccess} />;
    }
    if (activeForm === 'edit' && editEstablishmentId) {
      return (
        <EditEstablishmentView
          establishmentId={editEstablishmentId}
          onClose={closeForm}
          onSuccess={handleSuccess}
        />
      );
    }
    return null;
  }, [activeForm, editEstablishmentId, queryClient]);

  // Scroll to top when form opens (track previous value)
  const prevActiveFormRef = React.useRef(activeForm);
  React.useEffect(() => {
    if (prevActiveFormRef.current !== activeForm && activeForm !== null && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevActiveFormRef.current = activeForm;
  }, [activeForm]);

  return (
    <ManagementPage
      title="Gestion des Établissements"
      subtitle="Créez, modifiez et gérez tous vos établissements"
      contentRef={contentRef}
      actions={
        <div className="flex items-center gap-3">
          {(editEstablishmentId || openRowId) && (
            <AskCopilotButton prompt="Show statistics, active students, sessions, and tutors for this establishment." />
          )}
          {canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setActiveForm('create');
              setEditEstablishmentId(null);
              closeRow();
            }}
          >
            Créer un établissement
          </Button>
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
        <EstablishmentsDataTable
          showVscCount={true}
          expandedRowId={openRowId}
          onToggleRow={openRow}
          onCloseDetails={closeRow}
          onEditEstablishment={handleEditEstablishment}
          enableFilters={true}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
        />
      </CollapseReplaceWrapper>
    </ManagementPage>
  );
};
