import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SessionsDataTable } from '@/components/sessions/SessionsDataTable';
import { CreateSessionView } from '@/components/sessions/CreateSessionView';
import { EditSessionView } from '@/components/sessions/EditSessionView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface SessionsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

type ActiveForm = 'create' | 'edit' | null;

export const SessionsSection: React.FC<SessionsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const { canEditRow, canManageAttendance, canExportCsv } = usePageActions('sessions');
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editSessionId, setEditSessionId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const { openRowId, openRow, closeRow } = useDetailsView();
  const sectionRef = React.useRef<HTMLDivElement>(null);

  const closeForm = () => {
    setActiveForm(null);
    setEditSessionId(null);
  };

  const handleEditSession = (sessionId: string) => {
    setEditSessionId(sessionId);
    setActiveForm('edit');
    closeRow();
  };

  // Scroll to top when form opens (track previous value to detect real changes)
  const prevActiveFormRef = React.useRef(activeForm);
  React.useEffect(() => {
    // Only scroll if activeForm actually changed from a different value
    if (prevActiveFormRef.current !== activeForm && activeForm !== null && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevActiveFormRef.current = activeForm;
  }, [activeForm]);

  const tableContent = (
    <SessionsDataTable
      showCreateButton={true}
      onCreateSession={() => setActiveForm('create')}
      layoutWidth={layoutWidth}
      isSection={true}
      expandedRowId={openRowId}
      onToggleRow={openRow}
      onCloseDetails={closeRow}
      onEditSession={handleEditSession}
      pageActions={{ canEditRow, canManageAttendance, canExportCsv }}
    />
  );

  if (activeForm === 'create') {
    return (
      <div ref={sectionRef}>
        <CreateSessionView
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            onSuccess?.();
          }}
        />
      </div>
    );
  }

  if (activeForm === 'edit' && editSessionId) {
    return (
      <div ref={sectionRef}>
        <EditSessionView
          sessionId={editSessionId}
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
          }}
        />
      </div>
    );
  }

  return <div ref={sectionRef}>{tableContent}</div>;
};
