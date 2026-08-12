import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { SchoolYearsDataTable } from '@/components/school-years/SchoolYearsDataTable';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface SchoolYearsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const SchoolYearsSection: React.FC<SchoolYearsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('schoolYears');

  const handleCreateSchoolYear = () => {
    navigate('/dashboard/school-years?create=true');
  };

  const handleEditSchoolYear = (id: string) => {
    navigate(`/dashboard/school-years?edit=${id}`);
  };

  return (
    <SchoolYearsDataTable
      layoutWidth={layoutWidth}
      isSection={true}
      onEditSchoolYear={handleEditSchoolYear}
      showCreateButton={canCreate}
      onCreateSchoolYear={handleCreateSchoolYear}
      pageActions={{ canExportCsv }}
    />
  );
};
