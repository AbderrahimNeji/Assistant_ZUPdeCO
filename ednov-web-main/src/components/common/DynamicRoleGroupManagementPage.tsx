import * as React from 'react';
import { UserCog } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { AdminsDataTable } from '@/components/admins/AdminsDataTable';
import { CreateAdminView } from '@/components/admins/CreateAdminView';
import { EditAdminView } from '@/components/admins/EditAdminView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { useRoleGroupTabs } from '@/hooks/useRoleGroupTabs';

export interface DynamicRoleGroupManagementPageProps {
  /**
   * The interface_name to read IE from (equals role_group code with underscores
   * replaced by hyphens, e.g. 'admins', 'steering', 'service-users').
   */
  interfaceName: string;
  /**
   * element_id of the parent menu IE inside the management interface
   * (e.g. 'menu-admins', 'menu-steering').
   */
  menuId: string;
  /**
   * Page title displayed in the ManagementPage header.
   */
  title: string;
  /**
   * Subtitle shown below the title.
   */
  subtitle?: string;
  /**
   * Label for the "create" button.
   */
  createLabel?: string;
  /**
   * Query-key segment to invalidate on success (e.g. 'admin', 'steering').
   */
  userQueryKey?: string;
}

/**
 * Generic management page for admin-type role groups.
 *
 * Reads its tabs dynamically from the management interface (interfaceName + menuId),
 * resolves icons/colors from the live roles API, and delegates to AdminsDataTable
 * (which handles admin-type users regardless of role group).
 *
 * Used by AdminsManagementPage and any new role group page automatically
 * generated when a role is created with a new roleGroup code.
 */
export const DynamicRoleGroupManagementPage: React.FC<DynamicRoleGroupManagementPageProps> = ({
  interfaceName,
  menuId,
  title,
  subtitle = 'Créez, modifiez et gérez tous vos collaborateurs',
  createLabel = 'Créer un collaborateur',
  userQueryKey = 'admin',
}) => {
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions(interfaceName);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const [editAdminId, setEditAdminId] = React.useState<string | null>(null);
  const [initialRole, setInitialRole] = React.useState<string | undefined>(undefined);
  const { viewMode, setViewMode } = useViewMode(`${interfaceName}-management`);

  const { visibleTabs, showTabBar, activeRoleFilter, setActiveRoleFilter, enabledRoles } =
    useRoleGroupTabs(interfaceName, menuId);

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';
    const tab = searchParams.get('tab');
    const role = searchParams.get('role');

    if (editId) {
      setEditAdminId(editId);
      setCreateFormOpen(false);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditAdminId(null);
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditAdminId(null);
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
    setEditAdminId(null);
  };

  const handleSuccess = () => {
    handleCloseForm();
    queryClient.invalidateQueries({ queryKey: ['users', userQueryKey] });
  };

  return (
    <ManagementPage
      title={title}
      subtitle={subtitle}
      actions={
        canCreate ? (
          <Button
            preset="create-entity"
            onClick={() => {
              setCreateFormOpen(true);
              setEditAdminId(null);
              closeRow();
            }}
          >
            {createLabel}
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
        ariaLabel: 'Filtrage par rôle',
        visible: showTabBar,
      }}
    >
      <AdminsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditAdmin={(id) => {
          setEditAdminId(id);
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
        <CreateAdminView
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          initialRole={initialRole}
        />
      </SlidePanel>

      <SlidePanel isOpen={!!editAdminId} onClose={handleCloseForm}>
        {editAdminId && (
          <EditAdminView
            adminId={editAdminId}
            onClose={handleCloseForm}
            onSuccess={handleSuccess}
          />
        )}
      </SlidePanel>
    </ManagementPage>
  );
};
