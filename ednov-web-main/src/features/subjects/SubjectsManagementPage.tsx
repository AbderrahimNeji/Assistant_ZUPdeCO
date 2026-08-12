import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { SubjectsDataTable } from '@/components/subjects/SubjectsDataTable';
import { CreateSubjectView } from '@/components/subjects/CreateSubjectView';
import { EditSubjectView } from '@/components/subjects/EditSubjectView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

type ActiveForm = 'create' | 'edit' | null;

export const SubjectsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('subjects');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editSubjectId, setEditSubjectId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('subjects-management');
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditSubjectId(editId);
      setActiveForm('edit');
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setActiveForm(null);
      setEditSubjectId(null);
    }

    if (shouldCreate) {
      setActiveForm('create');
      setEditSubjectId(null);
      closeRow();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  const closeForm = () => {
    setActiveForm(null);
    setEditSubjectId(null);
  };

  const handleEditSubject = (subjectId: string) => {
    setEditSubjectId(subjectId);
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

  return (
    <ManagementPage
      title="Gestion des Matières"
      subtitle="Créez, modifiez et gérez toutes vos matières"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setActiveForm('create');
              setEditSubjectId(null);
              closeRow();
            }}
          >
            Créer une matière
          </Button>
        ) : undefined
      }
    >
      <SubjectsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditSubject={handleEditSubject}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={activeForm === 'create'} onClose={closeForm}>
        <CreateSubjectView
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
          }}
        />
      </SlidePanel>

      <SlidePanel isOpen={activeForm === 'edit' && !!editSubjectId} onClose={closeForm}>
        {editSubjectId && (
          <EditSubjectView
            subjectId={editSubjectId}
            onClose={closeForm}
            onSuccess={() => {
              closeForm();
              queryClient.invalidateQueries({ queryKey: ['subjects'] });
            }}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
