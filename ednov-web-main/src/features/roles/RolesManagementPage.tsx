import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { CollapseReplaceWrapper } from '@/components/common/CollapseReplaceWrapper';
import { RolesDataTable } from '@/components/roles/RolesDataTable';
import { CreateRoleView } from '@/components/roles/CreateRoleView';
import { EditRoleView } from '@/components/roles/EditRoleView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

type ActiveForm = 'create' | 'edit' | null;

export const RolesManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('roles');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editRoleId, setEditRoleId] = React.useState<string | null>(null);
  const { viewMode, setViewMode } = useViewMode('roles-management');
  const { openRowId, openRow, closeRow } = useDetailsView();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const viewId = searchParams.get('view');
    const editId = searchParams.get('edit');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditRoleId(editId);
      setActiveForm('edit');
      closeRow();
    } else if (viewId) {
      openRow(viewId);
      setActiveForm(null);
      setEditRoleId(null);
    } else if (shouldCreate) {
      setActiveForm('create');
      setEditRoleId(null);
      closeRow();
    }
  }, [searchParams, openRow, closeRow]);

  const closeForm = () => {
    setActiveForm(null);
    setEditRoleId(null);
  };

  const handleEditRole = (roleId: string) => {
    setEditRoleId(roleId);
    setActiveForm('edit');
    closeRow();
  };

  const handleSuccess = () => {
    closeForm();
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  };

  const formContent = React.useMemo(() => {
    if (activeForm === 'create') {
      return <CreateRoleView onClose={closeForm} onSuccess={handleSuccess} />;
    }
    if (activeForm === 'edit' && editRoleId) {
      return <EditRoleView roleId={editRoleId} onClose={closeForm} onSuccess={handleSuccess} />;
    }
    return null;
  }, [activeForm, editRoleId]);

  const prevActiveFormRef = React.useRef(activeForm);
  React.useEffect(() => {
    if (prevActiveFormRef.current !== activeForm && activeForm !== null && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevActiveFormRef.current = activeForm;
  }, [activeForm]);

  return (
    <ManagementPage
      title="Rôles & Permissions"
      subtitle="Créez, modifiez et configurez tous vos rôles"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setActiveForm('create');
              setEditRoleId(null);
              closeRow();
            }}
          >
            Créer un rôle
          </Button>
        ) : undefined
      }
    >
      <CollapseReplaceWrapper
        mode="replace"
        isOpen={activeForm !== null}
        onToggle={closeForm}
        collapsePosition="top"
        formContent={formContent}
      >
        <RolesDataTable
          expandedRowId={openRowId}
          onToggleRow={openRow}
          onCloseDetails={closeRow}
          onEditRole={handleEditRole}
          enableFilters={true}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
        />
      </CollapseReplaceWrapper>
    </ManagementPage>
  );
};
