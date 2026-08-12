import * as React from 'react';
import { PairsDataTable } from '@/components/matching/PairsDataTable';
import { useNavigate } from 'react-router-dom';
import { usePageActions } from '@/hooks/usePageActions';
import type { ElementWidth } from '@/types/interface-elements.types';

interface PairsSectionProps {
  layoutWidth?: ElementWidth;
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  onCloseDetails?: () => void;
}

export const PairsSection: React.FC<PairsSectionProps> = ({
  layoutWidth = 'full',
  expandedRowId,
  onToggleRow,
  onCloseDetails,
}) => {
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { canExportCsv } = usePageActions('pairs');

  const handleNavigateToConfig = () => {
    navigate('/dashboard/matching?tab=configure');
  };

  return (
    <div ref={sectionRef}>
      <PairsDataTable
        onNavigateToConfig={handleNavigateToConfig}
        layoutWidth={layoutWidth}
        isSection={true}
        expandedRowId={expandedRowId}
        onToggleRow={onToggleRow}
        onCloseDetails={onCloseDetails}
        pageActions={{ canExportCsv }}
      />
    </div>
  );
};
