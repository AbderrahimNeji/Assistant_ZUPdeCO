import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { HolidaysDataTable } from '@/components/holidays/HolidaysDataTable';
import { CreateHolidayView } from '@/components/holidays/CreateHolidayView';
import { EditHolidayView } from '@/components/holidays/EditHolidayView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

export const HolidaysManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('holidays');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editHolidayId, setEditHolidayId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('holidays-management');
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditHolidayId(editId);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditHolidayId(null);
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditHolidayId(null);
      closeRow();
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  const handleEditHoliday = (id: string) => {
    setEditHolidayId(id);
    closeRow();
  };

  // Scroll to top when form opens (track previous values)
  const prevCreateFormRef = React.useRef(createFormOpen);
  const prevEditIdRef = React.useRef(editHolidayId);
  React.useEffect(() => {
    const formStateChanged =
      prevCreateFormRef.current !== createFormOpen || prevEditIdRef.current !== editHolidayId;
    if (formStateChanged && (createFormOpen || editHolidayId !== null) && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevCreateFormRef.current = createFormOpen;
    prevEditIdRef.current = editHolidayId;
  }, [createFormOpen, editHolidayId]);

  return (
    <ManagementPage
      title="Gestion des Vacances et Jours Fériés"
      subtitle="Créez, modifiez et gérez toutes vos vacances et jours fériés"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditHolidayId(null);
              closeRow();
            }}
          >
            Créer une vacance/férié
          </Button>
        ) : undefined
      }
    >
      <HolidaysDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditHoliday={handleEditHoliday}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={() => setCreateFormOpen(false)}>
        <CreateHolidayView
          onClose={() => setCreateFormOpen(false)}
          onSuccess={() => {
            setCreateFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
          }}
        />
      </SlidePanel>

      <SlidePanel isOpen={editHolidayId !== null} onClose={() => setEditHolidayId(null)}>
        {editHolidayId && (
          <EditHolidayView
            holidayId={editHolidayId}
            onClose={() => setEditHolidayId(null)}
            onSuccess={() => {
              setEditHolidayId(null);
              queryClient.invalidateQueries({ queryKey: ['holidays'] });
            }}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
