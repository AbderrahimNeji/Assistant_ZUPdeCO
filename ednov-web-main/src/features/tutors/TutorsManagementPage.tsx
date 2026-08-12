import * as React from 'react';
import { UserCog } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { TutorsDataTable } from '@/components/tutors/TutorsDataTable';
import { CreateTutorView } from '@/components/tutors/CreateTutorView';
import { EditTutorView } from '@/components/tutors/EditTutorView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { useRoleGroupTabs } from '@/hooks/useRoleGroupTabs';
import { useAssistantLauncher, AskCopilotButton } from '@/features/copilot';

export const TutorsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('tutors');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editTutorId, setEditTutorId] = React.useState<string | null>(null);
  const [initialRole, setInitialRole] = React.useState<string | undefined>(undefined);
  const { viewMode, setViewMode } = useViewMode('tutors-management');
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { setSelection, setEntity, clearSelection } = useAssistantLauncher();

  const { visibleTabs, showTabBar, activeRoleFilter, setActiveRoleFilter, enabledRoles } =
    useRoleGroupTabs('tutors', 'menu-tutors');

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';
    const tab = searchParams.get('tab');
    const role = searchParams.get('role');

    if (editId) {
      setEditTutorId(editId);
      setCreateFormOpen(false);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditTutorId(null);
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditTutorId(null);
      closeRow();
      if (role) setInitialRole(role);
      searchParams.delete('create');
      if (!role) searchParams.delete('role');
      setSearchParams(searchParams, { replace: true });
    }

    if (tab) {
      setActiveRoleFilter(tab);
    }
  }, [searchParams, setSearchParams, closeRow, openRow, setActiveRoleFilter]);

  React.useEffect(() => {
    const focusedId = editTutorId || openRowId;
    if (!focusedId) {
      clearSelection();
      setEntity('tutor', undefined);
      return;
    }

    let cancelled = false;

    const resolveLabel = (): string => {
      const lists = queryClient.getQueriesData<{
        data?: Array<{
          id?: string;
          displayName?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        }>;
        items?: Array<{
          id?: string;
          displayName?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        }>;
      }>({ queryKey: ['users', 'tutor'] });

      for (const [, page] of lists) {
        const rows = page?.data ?? page?.items ?? [];
        const hit = rows.find((r) => r.id === focusedId);
        if (hit) {
          const full = `${hit.firstName ?? ''} ${hit.lastName ?? ''}`.trim();
          if (full) return full;
          if (hit.displayName?.trim()) return hit.displayName.trim();
        }
      }

      const detail = queryClient.getQueryData<{
        displayName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }>(['users', 'tutor', focusedId]);
      if (detail) {
        const full = `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim();
        if (full) return full;
        if (detail.displayName?.trim()) return detail.displayName.trim();
      }
      return 'Tuteur sélectionné';
    };

    const apply = (label: string) => {
      if (cancelled) return;
      const ref = { type: 'tutor' as const, id: focusedId, label };
      setSelection(ref);
      setEntity('tutor', ref);
    };

    apply(resolveLabel());

    void (async () => {
      try {
        const { getTutor } = await import('@/services/users.service');
        const tutor = await getTutor(focusedId);
        const full =
          `${tutor.firstName ?? ''} ${tutor.lastName ?? ''}`.trim() ||
          tutor.displayName?.trim() ||
          'Tuteur sélectionné';
        apply(full);
      } catch {
        // Keep cache/fallback label — never invent.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editTutorId, openRowId, setSelection, setEntity, clearSelection, queryClient]);

  const handleCloseForm = () => {
    setCreateFormOpen(false);
    setEditTutorId(null);
  };

  const handleSuccess = () => {
    handleCloseForm();
    queryClient.invalidateQueries({ queryKey: ['users', 'tutor'] });
  };

  return (
    <ManagementPage
      title="Gestion des Tuteurs"
      subtitle="Créez, modifiez et gérez tous vos tuteurs"
      actions={
        <div className="flex items-center gap-3">
          {(editTutorId || openRowId) && (
            <AskCopilotButton prompt="Show this tutor’s workload, assigned students, and availability." />
          )}
          {canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditTutorId(null);
              closeRow();
            }}
          >
            Créer un tuteur
          </Button>
          ) : null}
        </div>
      }
      tabs={{
        items: [
          { id: 'all', label: 'Tous', icon: <UserCog className="h-4 w-4" /> },
          ...visibleTabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: (
              <DynamicIcon
                name={tab.icon}
                className="h-4 w-4"
                style={tab.color ? { color: tab.color } : undefined}
              />
            ),
          })),
        ],
        activeTab: activeRoleFilter,
        onTabChange: setActiveRoleFilter,
        variant: 'default',
        size: 'md',
        ariaLabel: 'Filtrage par rôle tuteur',
        visible: showTabBar,
      }}
    >
      <TutorsDataTable
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditTutor={(id) => {
          setEditTutorId(id);
          setCreateFormOpen(false);
          closeRow();
        }}
        enableFilters={true}
        enabledRoles={enabledRoles}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={handleCloseForm}>
        <CreateTutorView
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          initialRole={initialRole}
        />
      </SlidePanel>

      <SlidePanel isOpen={!!editTutorId} onClose={handleCloseForm}>
        {editTutorId && (
          <EditTutorView
            tutorId={editTutorId}
            onClose={handleCloseForm}
            onSuccess={handleSuccess}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
