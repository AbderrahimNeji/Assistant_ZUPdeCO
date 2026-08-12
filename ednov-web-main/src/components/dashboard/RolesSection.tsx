import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { RolesDataTable } from '@/components/roles/RolesDataTable';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface RolesSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const RolesSection: React.FC<RolesSectionProps> = ({ onSuccess, layoutWidth = 'full' }) => {
  const navigate = useNavigate();
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('roles');
  const { openRowId, openRow, closeRow } = useDetailsView();

  const handleCreateRole = () => {
    navigate('/dashboard/roles?create=true');
  };

  const handleEditRole = (roleId: string) => {
    navigate(`/dashboard/roles?edit=${roleId}`);
  };

  return (
    <RolesDataTable
      showCreateButton={canCreate}
      onCreateRole={handleCreateRole}
      isSection={true}
      layoutWidth={layoutWidth}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditRole={handleEditRole}
      pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
    />
  );
};
