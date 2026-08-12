import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityTypesDataTable } from '@/components/activity-types/ActivityTypesDataTable';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface ActivityTypesSectionProps {
  layoutWidth?: ElementWidth;
  onSuccess?: () => void;
}

export const ActivityTypesSection: React.FC<ActivityTypesSectionProps> = ({
  layoutWidth = 'full',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('activityTypes');
  const { openRowId, openRow, closeRow } = useDetailsView();

  const handleCreateActivityType = () => {
    navigate('/dashboard/activity-types?create=true');
  };

  const handleEditActivityType = (id: string) => {
    navigate(`/dashboard/activity-types?edit=${id}`);
  };

  return (
    <ActivityTypesDataTable
      isSection={true}
      showCreateButton={canCreate}
      onCreateActivityType={handleCreateActivityType}
      layoutWidth={layoutWidth}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditActivityType={handleEditActivityType}
      pageActions={{ canExportCsv }}
    />
  );
};
