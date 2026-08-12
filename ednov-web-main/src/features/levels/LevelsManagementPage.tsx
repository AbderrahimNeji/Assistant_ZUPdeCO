import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { LevelsDataTable } from '@/components/levels/LevelsDataTable';
import { CreateLevelView } from '@/components/levels/CreateLevelView';
import { EditLevelView } from '@/components/levels/EditLevelView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

export const LevelsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('levels');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editLevelId, setEditLevelId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('levels-management');
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditLevelId(editId);
      setCreateFormOpen(false);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditLevelId(null);
    }

    if (shouldCreate) {
      handleCreateLevel();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  const handleCreateLevel = React.useCallback(() => {
    setCreateFormOpen(true);
    setEditLevelId(null);
    closeRow();
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [closeRow]);

  const handleEditLevel = React.useCallback(
    (id: string) => {
      setEditLevelId(id);
      setCreateFormOpen(false);
      closeRow();
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
    [closeRow],
  );

  const handleCloseCreate = React.useCallback(() => {
    setCreateFormOpen(false);
  }, []);

  const handleSuccessCreate = React.useCallback(() => {
    setCreateFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['levels'] });
  }, [queryClient]);

  const handleCloseEdit = React.useCallback(() => {
    setEditLevelId(null);
  }, []);

  const handleSuccessEdit = React.useCallback(() => {
    setEditLevelId(null);
    queryClient.invalidateQueries({ queryKey: ['levels'] });
  }, [queryClient]);

  return (
    <ManagementPage
      title="Gestion des Niveaux"
      subtitle="Créez, modifiez et gérez tous vos niveaux scolaires"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button preset="create-entity" onClick={handleCreateLevel}>
            Créer un niveau
          </Button>
        ) : undefined
      }
    >
      <LevelsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditLevel={handleEditLevel}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={handleCloseCreate}>
        <CreateLevelView onClose={handleCloseCreate} onSuccess={handleSuccessCreate} />
      </SlidePanel>

      <SlidePanel isOpen={!!editLevelId} onClose={handleCloseEdit}>
        {editLevelId && (
          <EditLevelView
            levelId={editLevelId}
            onClose={handleCloseEdit}
            onSuccess={handleSuccessEdit}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
