import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CollapseReplaceWrapper } from '@/components/common/CollapseReplaceWrapper';
import { useDetailsView } from '@/components/common/details';
import { VscReportsDataTable } from '@/components/vsc-reports/VscReportsDataTable';
import { CreateVscReportView } from '@/components/vsc-reports/CreateVscReportView';
import { EditVscReportView } from '@/components/vsc-reports/EditVscReportView';
import type { ElementWidth } from '@/types/interface-elements.types';

interface VscReportsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

export const VscReportsSection: React.FC<VscReportsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const [panelMode, setPanelMode] = React.useState<'none' | 'create' | 'edit'>('none');
  const [editTarget, setEditTarget] = React.useState<{
    sessionId: string;
    reportId: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const { openRowId, openRow, closeRow } = useDetailsView();

  const closePanel = React.useCallback(() => {
    setPanelMode('none');
    setEditTarget(null);
  }, []);

  const handleSuccess = React.useCallback(() => {
    closePanel();
    void queryClient.invalidateQueries({ queryKey: ['vsc-reports'] });
    onSuccess?.();
  }, [closePanel, queryClient, onSuccess]);

  const formContent =
    panelMode === 'create' ? (
      <CreateVscReportView onClose={closePanel} onSuccess={handleSuccess} />
    ) : panelMode === 'edit' && editTarget ? (
      <EditVscReportView
        sessionId={editTarget.sessionId}
        reportId={editTarget.reportId}
        onClose={closePanel}
        onSuccess={handleSuccess}
      />
    ) : null;

  return (
    <CollapseReplaceWrapper
      mode="replace"
      isOpen={panelMode !== 'none'}
      onToggle={closePanel}
      formContent={formContent}
    >
      <VscReportsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        showCreateButton={false}
        onCreateReport={() => {
          closeRow();
          setEditTarget(null);
          setPanelMode('create');
        }}
        onEditReport={(sessionId, reportId) => {
          closeRow();
          setEditTarget({ sessionId, reportId });
          setPanelMode('edit');
        }}
        layoutWidth={layoutWidth}
        isSection={true}
      />
    </CollapseReplaceWrapper>
  );
};
