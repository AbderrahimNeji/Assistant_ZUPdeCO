import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { LevelsDataTable } from '@/components/levels/LevelsDataTable';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface LevelsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const LevelsSection: React.FC<LevelsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('levels');

  const handleCreateLevel = () => {
    navigate('/dashboard/levels?create=true');
  };

  const handleEditLevel = (id: string) => {
    navigate(`/dashboard/levels?edit=${id}`);
  };

  return (
    <LevelsDataTable
      layoutWidth={layoutWidth}
      onEditLevel={handleEditLevel}
      isSection={true}
      showCreateButton={canCreate}
      onCreateLevel={handleCreateLevel}
      pageActions={{ canExportCsv }}
    />
  );
};
