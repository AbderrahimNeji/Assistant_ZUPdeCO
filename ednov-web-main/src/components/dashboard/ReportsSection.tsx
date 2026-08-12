import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ReportsDataTable } from '@/components/reports/ReportsDataTable';
import { CreateReportView } from '@/components/reports/CreateReportView';
import { EditReportView } from '@/components/reports/EditReportView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import type { ElementWidth } from '@/types/interface-elements.types';

interface ReportsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

type ActiveForm = 'create' | 'edit' | null;

export const ReportsSection: React.FC<ReportsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editReportData, setEditReportData] = React.useState<{
    sessionId: string;
    reportId: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const { openRowId, openRow, closeRow } = useDetailsView();
  const sectionRef = React.useRef<HTMLDivElement>(null);

  const closeForm = () => {
    setActiveForm(null);
    setEditReportData(null);
  };

  const handleEditReport = (sessionId: string, reportId: string) => {
    setEditReportData({ sessionId, reportId });
    setActiveForm('edit');
    closeRow();
  };

  // Scroll to top when form opens (track previous value)
  const prevActiveFormRef = React.useRef(activeForm);
  React.useEffect(() => {
    if (prevActiveFormRef.current !== activeForm && activeForm !== null && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevActiveFormRef.current = activeForm;
  }, [activeForm]);

  const tableContent = (
    <ReportsDataTable
      isSection={true}
      layoutWidth={layoutWidth}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditReport={handleEditReport}
    />
  );

  if (activeForm === 'create') {
    return (
      <div ref={sectionRef}>
        <CreateReportView
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            onSuccess?.();
          }}
        />
      </div>
    );
  }

  if (activeForm === 'edit' && editReportData) {
    return (
      <div ref={sectionRef}>
        <EditReportView
          sessionId={editReportData.sessionId}
          reportId={editReportData.reportId}
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['reports'] });
          }}
        />
      </div>
    );
  }

  return <div ref={sectionRef}>{tableContent}</div>;
};
