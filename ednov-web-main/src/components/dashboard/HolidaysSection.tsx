import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { HolidaysDataTable } from '@/components/holidays/HolidaysDataTable';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface HolidaysSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const HolidaysSection: React.FC<HolidaysSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const { canCreate, canExportCsv } = usePageActions('holidays');
  const { openRowId, openRow, closeRow } = useDetailsView();

  const handleCreateHoliday = () => {
    navigate('/dashboard/holidays?create=true');
  };

  const handleEditHoliday = (holidayId: string) => {
    navigate(`/dashboard/holidays?edit=${holidayId}`);
  };

  return (
    <HolidaysDataTable
      showCreateButton={canCreate}
      onCreateHoliday={handleCreateHoliday}
      isSection={true}
      layoutWidth={layoutWidth}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditHoliday={handleEditHoliday}
      pageActions={{ canExportCsv }}
    />
  );
};
