import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubjectsDataTable } from '@/components/subjects/SubjectsDataTable';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface SubjectsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const SubjectsSection: React.FC<SubjectsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('subjects');
  const { openRowId, openRow, closeRow } = useDetailsView();

  const handleCreateSubject = () => {
    navigate('/dashboard/subjects?create=true');
  };

  const handleEditSubject = (subjectId: string) => {
    navigate(`/dashboard/subjects?edit=${subjectId}`);
  };

  return (
    <SubjectsDataTable
      showCreateButton={canCreate}
      onCreateSubject={handleCreateSubject}
      isSection={true}
      layoutWidth={layoutWidth}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditSubject={handleEditSubject}
      pageActions={{ canExportCsv }}
    />
  );
};
