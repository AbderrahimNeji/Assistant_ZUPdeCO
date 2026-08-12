import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivitiesDataTable } from '@/components/activities/ActivitiesDataTable';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface ActivitiesSectionProps {
  layoutWidth?: ElementWidth;
  onSuccess?: () => void;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  layoutWidth = 'full',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('activities');
  const { openRowId, openRow, closeRow } = useDetailsView();

  const handleCreateActivity = () => {
    navigate('/dashboard/activities?create=true');
  };

  const handleEditActivity = (id: string) => {
    navigate(`/dashboard/activities?edit=${id}`);
  };

  return (
    <ActivitiesDataTable
      showCreateButton={canCreate}
      isSection={true}
      layoutWidth={layoutWidth}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditActivity={handleEditActivity}
      onCreateClick={handleCreateActivity}
      pageActions={{ canExportCsv }}
    />
  );
};
