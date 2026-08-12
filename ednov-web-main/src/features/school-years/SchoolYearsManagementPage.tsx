import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { SchoolYearsDataTable } from '@/components/school-years/SchoolYearsDataTable';
import { CreateSchoolYearView } from '@/components/school-years/CreateSchoolYearView';
import { EditSchoolYearView } from '@/components/school-years/EditSchoolYearView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

export const SchoolYearsManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('schoolYears');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editSchoolYearId, setEditSchoolYearId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('school-years-management');

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditSchoolYearId(editId);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditSchoolYearId(null);
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditSchoolYearId(null);
      closeRow();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  const handleEditSchoolYear = (id: string) => {
    setEditSchoolYearId(id);
    closeRow();
  };

  return (
    <ManagementPage
      title="Gestion des Années Scolaires"
      subtitle="Créez, modifiez et gérez toutes vos années scolaires"
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditSchoolYearId(null);
              closeRow();
            }}
          >
            Créer une année scolaire
          </Button>
        ) : undefined
      }
    >
      <SchoolYearsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditSchoolYear={handleEditSchoolYear}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={() => setCreateFormOpen(false)}>
        <CreateSchoolYearView
          onClose={() => setCreateFormOpen(false)}
          onSuccess={() => {
            setCreateFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
          }}
        />
      </SlidePanel>

      <SlidePanel isOpen={!!editSchoolYearId} onClose={() => setEditSchoolYearId(null)}>
        {editSchoolYearId && (
          <EditSchoolYearView
            schoolYearId={editSchoolYearId}
            onClose={() => setEditSchoolYearId(null)}
            onSuccess={() => {
              setEditSchoolYearId(null);
              queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
            }}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
