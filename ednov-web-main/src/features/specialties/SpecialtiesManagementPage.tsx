import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { SpecialtiesDataTable } from '@/components/specialties/SpecialtiesDataTable';
import { CreateSpecialtyView } from '@/components/specialties/CreateSpecialtyView';
import { EditSpecialtyView } from '@/components/specialties/EditSpecialtyView';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';

export const SpecialtiesManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow } = usePageActions('specialties');
  const queryClient = useQueryClient();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editSpecialtyId, setEditSpecialtyId] = React.useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const handleCreateSpecialty = React.useCallback(() => {
    setCreateFormOpen(true);
    setEditSpecialtyId(null);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleEditSpecialty = React.useCallback((id: string) => {
    setEditSpecialtyId(id);
    setCreateFormOpen(false);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleCloseCreate = React.useCallback(() => {
    setCreateFormOpen(false);
  }, []);

  const handleSuccessCreate = React.useCallback(() => {
    setCreateFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['specialties'] });
  }, [queryClient]);

  const handleCloseEdit = React.useCallback(() => {
    setEditSpecialtyId(null);
  }, []);

  const handleSuccessEdit = React.useCallback(() => {
    setEditSpecialtyId(null);
    queryClient.invalidateQueries({ queryKey: ['specialties'] });
  }, [queryClient]);

  return (
    <ManagementPage
      title="Gestion des Spécialités"
      subtitle="Créez, modifiez et gérez les spécialités proposées par les lycées"
      contentRef={contentRef}
      actions={
        canCreate ? (
          <Button preset="create-entity" onClick={handleCreateSpecialty}>
            Créer une spécialité
          </Button>
        ) : undefined
      }
    >
      <SpecialtiesDataTable
        onEditSpecialty={handleEditSpecialty}
        pageActions={{ canEditRow, canDeleteRow }}
        showCreateButton={false}
      />

      <SlidePanel isOpen={createFormOpen} onClose={handleCloseCreate}>
        <CreateSpecialtyView onClose={handleCloseCreate} onSuccess={handleSuccessCreate} />
      </SlidePanel>

      <SlidePanel isOpen={!!editSpecialtyId} onClose={handleCloseEdit}>
        {editSpecialtyId && (
          <EditSpecialtyView
            specialtyId={editSpecialtyId}
            onClose={handleCloseEdit}
            onSuccess={handleSuccessEdit}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
