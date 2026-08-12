import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentsDataTable } from '@/components/students/StudentsDataTable';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface StudentsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const StudentsSection: React.FC<StudentsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('students');

  const handleCreateStudent = () => {
    navigate('/dashboard/students?create=true');
  };

  const handleEditStudent = (id: string) => {
    navigate(`/dashboard/students?edit=${id}`);
  };

  return (
    <StudentsDataTable
      layoutWidth={layoutWidth}
      isSection={true}
      onEditStudent={handleEditStudent}
      showCreateButton={canCreate}
      onCreateStudent={handleCreateStudent}
      pageActions={{ canExportCsv }}
    />
  );
};
