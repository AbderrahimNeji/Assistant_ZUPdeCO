import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EstablishmentsDataTable } from '@/components/establishments/EstablishmentsDataTable';
import { CreateEstablishmentView } from '@/components/establishments/CreateEstablishmentView';
import { EditEstablishmentView } from '@/components/establishments/EditEstablishmentView';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { usePageActions } from '@/hooks/usePageActions';
import type { Establishment } from '@/types/establishment.types';
import type { ElementWidth } from '@/types/interface-elements.types';

type ActiveForm = 'create' | 'edit' | null;

interface EstablishmentsSectionProps {
  layoutWidth?: ElementWidth;
  onSuccess?: () => void;
}

export const EstablishmentsSection: React.FC<EstablishmentsSectionProps> = ({
  layoutWidth = 'full',
  onSuccess,
}) => {
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);
  const [editEstablishmentId, setEditEstablishmentId] = React.useState<string | null>(null);
  const { openRowId, openRow, closeRow } = useDetailsView();
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { canExportCsv } = usePageActions('establishments');

  const closeForm = () => {
    setActiveForm(null);
    setEditEstablishmentId(null);
  };

  const handleSuccess = () => {
    closeForm();
    queryClient.invalidateQueries({ queryKey: ['establishments'], exact: true });
    onSuccess?.();
  };

  const handleEditEstablishment = (establishment: Establishment) => {
    setEditEstablishmentId(establishment.id);
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

  if (activeForm === 'create') {
    return (
      <div ref={sectionRef}>
        <CreateEstablishmentView onClose={closeForm} onSuccess={handleSuccess} />
      </div>
    );
  }

  if (activeForm === 'edit' && editEstablishmentId) {
    return (
      <div ref={sectionRef}>
        <EditEstablishmentView
          establishmentId={editEstablishmentId}
          onClose={closeForm}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return (
    <div ref={sectionRef}>
      <EstablishmentsDataTable
        showCreateButton={true}
        layoutWidth={layoutWidth}
        isSection={true}
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditEstablishment={handleEditEstablishment}
        onCreateClick={() => {
          setActiveForm('create');
          setEditEstablishmentId(null);
          closeRow();
        }}
        pageActions={{ canExportCsv }}
      />
    </div>
  );
};
