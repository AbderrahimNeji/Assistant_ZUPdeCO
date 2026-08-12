import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgramsDataTable } from '@/components/programs/ProgramsDataTable';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface ProgramsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const ProgramsSection: React.FC<ProgramsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('programs');

  const handleCreateProgram = () => {
    navigate('/dashboard/programs?create=true');
  };

  const handleEditProgram = (id: string) => {
    navigate(`/dashboard/programs?edit=${id}`);
  };

  return (
    <ProgramsDataTable
      onEditProgram={handleEditProgram}
      layoutWidth={layoutWidth}
      isSection
      showCreateButton={canCreate}
      onCreateProgram={handleCreateProgram}
      pageActions={{ canExportCsv }}
    />
  );
};
