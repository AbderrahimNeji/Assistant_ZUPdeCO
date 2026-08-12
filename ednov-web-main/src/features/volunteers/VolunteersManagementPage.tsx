import * as React from 'react';
import { UserCog } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { VolunteersDataTable } from '@/components/volunteers/VolunteersDataTable';
import { CreateVolunteerView } from '@/components/volunteers/CreateVolunteerView';
import { EditVolunteerView } from '@/components/volunteers/EditVolunteerView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { useRoleGroupTabs } from '@/hooks/useRoleGroupTabs';

export const VolunteersManagementPage: React.FC = () => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('volunteers');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editVolunteerId, setEditVolunteerId] = React.useState<string | null>(null);
  const [initialRole, setInitialRole] = React.useState<string | undefined>(undefined);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const { viewMode, setViewMode } = useViewMode('volunteers-management');

  const { visibleTabs, showTabBar, activeRoleFilter, setActiveRoleFilter, enabledRoles } =
    useRoleGroupTabs('volunteers', 'menu-volunteers');

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';
    const tab = searchParams.get('tab');
    const role = searchParams.get('role');

    if (editId) {
      setEditVolunteerId(editId);
      setCreateFormOpen(false);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditVolunteerId(null);
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditVolunteerId(null);
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

  const handleCloseForm = () => {
    setCreateFormOpen(false);
    setEditVolunteerId(null);
  };

  const handleSuccess = () => {
    handleCloseForm();
    queryClient.invalidateQueries({ queryKey: ['users', 'volunteer'] });
  };

  return (
    <ManagementPage
      title="Gestion des volontaires"
      subtitle="Créez, modifiez et gérez tous vos volontaires"
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditVolunteerId(null);
              closeRow();
            }}
          >
            Créer un volontaire
          </Button>
        ) : undefined
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
        ariaLabel: 'Filtrage par rôle VSC',
        visible: showTabBar,
      }}
    >
      <VolunteersDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditVolunteer={(id) => {
          setEditVolunteerId(id);
          setCreateFormOpen(false);
          closeRow();
        }}
        enableFilters={true}
        enabledRoles={enabledRoles}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={handleCloseForm}>
        <CreateVolunteerView
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          initialRole={initialRole}
        />
      </SlidePanel>

      <SlidePanel isOpen={!!editVolunteerId} onClose={handleCloseForm}>
        {editVolunteerId && (
          <EditVolunteerView
            volunteerId={editVolunteerId}
            onClose={handleCloseForm}
            onSuccess={handleSuccess}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
