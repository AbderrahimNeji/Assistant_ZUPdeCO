import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { ActivityTypesDataTable } from '@/components/activity-types/ActivityTypesDataTable';
import { CreateActivityTypeView } from '@/components/activity-types/CreateActivityTypeView';
import { EditActivityTypeView } from '@/components/activity-types/EditActivityTypeView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

type ActiveForm = 'create' | 'edit' | null;

export const ActivityTypesManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('activityTypes');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editActivityTypeId, setEditActivityTypeId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('activity-types-management');
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setActiveForm('edit');
      setEditActivityTypeId(editId);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setActiveForm(null);
      setEditActivityTypeId(null);
    }

    if (shouldCreate) {
      setActiveForm('create');
      setEditActivityTypeId(null);
      closeRow();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  const handleEditActivityType = React.useCallback(
    (id: string) => {
      setActiveForm('edit');
      setEditActivityTypeId(id);
      closeRow();
    },
    [closeRow],
  );

  const closeForm = React.useCallback(() => {
    setActiveForm(null);
    setEditActivityTypeId(null);
  }, []);

  const handleSuccess = React.useCallback(() => {
    closeForm();
    queryClient.invalidateQueries({ queryKey: ['activityTypes'] });
  }, [closeForm, queryClient]);

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
      title="Gestion des Types d'Activités"
      subtitle="Créez, modifiez et gérez tous vos types d'activités"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setActiveForm('create');
              setEditActivityTypeId(null);
              closeRow();
            }}
          >
            Créer un type d'activité
          </Button>
        ) : undefined
      }
    >
      <ActivityTypesDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditActivityType={handleEditActivityType}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={activeForm === 'create'} onClose={closeForm}>
        <CreateActivityTypeView onClose={closeForm} onSuccess={handleSuccess} />
      </SlidePanel>

      <SlidePanel isOpen={activeForm === 'edit' && editActivityTypeId !== null} onClose={closeForm}>
        {editActivityTypeId && (
          <EditActivityTypeView
            activityTypeId={editActivityTypeId}
            onClose={closeForm}
            onSuccess={handleSuccess}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
