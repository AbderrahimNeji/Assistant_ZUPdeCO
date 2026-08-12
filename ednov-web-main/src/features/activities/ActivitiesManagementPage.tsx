import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { ActivitiesDataTable } from '@/components/activities/ActivitiesDataTable';
import { CreateActivityView } from '@/components/activities/CreateActivityView';
import { EditActivityView } from '@/components/activities/EditActivityView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

export const ActivitiesManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('activities');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editActivityId, setEditActivityId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('activities-management');
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditActivityId(editId);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditActivityId(null);
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditActivityId(null);
      closeRow();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  const handleEditActivity = (id: string) => {
    setEditActivityId(id);
    closeRow();
  };

  // Scroll to top when form opens (track previous values)
  const prevCreateFormRef = React.useRef(createFormOpen);
  const prevEditIdRef = React.useRef(editActivityId);
  React.useEffect(() => {
    const formStateChanged =
      prevCreateFormRef.current !== createFormOpen || prevEditIdRef.current !== editActivityId;
    if (formStateChanged && (createFormOpen || editActivityId) && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevCreateFormRef.current = createFormOpen;
    prevEditIdRef.current = editActivityId;
  }, [createFormOpen, editActivityId]);

  return (
    <ManagementPage
      title="Gestion des Activités"
      subtitle="Créez, modifiez et gérez toutes vos activités"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditActivityId(null);
              closeRow();
            }}
          >
            Créer une activité
          </Button>
        ) : undefined
      }
    >
      <ActivitiesDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditActivity={handleEditActivity}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={() => setCreateFormOpen(false)}>
        <CreateActivityView
          onClose={() => setCreateFormOpen(false)}
          onSuccess={() => {
            setCreateFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ['activities'] });
          }}
        />
      </SlidePanel>

      <SlidePanel isOpen={!!editActivityId} onClose={() => setEditActivityId(null)}>
        {editActivityId && (
          <EditActivityView
            activityId={editActivityId}
            onClose={() => setEditActivityId(null)}
            onSuccess={() => {
              setEditActivityId(null);
              queryClient.invalidateQueries({ queryKey: ['activities'] });
            }}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
