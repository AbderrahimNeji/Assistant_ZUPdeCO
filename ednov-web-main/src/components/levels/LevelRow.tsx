import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { LEVEL_STATUS_CONFIG, LEVEL_CYCLE_CONFIG } from './level-configs';
import type { Level } from '@/types/level.types';

interface LevelRowProps {
  level: Level;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const LevelRow: React.FC<LevelRowProps> = ({
  level,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = LEVEL_STATUS_CONFIG[level.status];
  const cycleConfig = level.educationCycle ? LEVEL_CYCLE_CONFIG[level.educationCycle] : null;
  const StatusIcon = statusConfig.icon;
  const CycleIcon = cycleConfig?.icon;

  const ageRange = level.minAge && level.maxAge ? `${level.minAge}-${level.maxAge} ans` : null;

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{level.code}</span>
        </div>
      </td>

      <td>
        <span className="text-foreground">{level.label}</span>
      </td>

      <td>
        {cycleConfig && CycleIcon && (
          <LabelBadge
            label={cycleConfig.label}
            icon={CycleIcon}
            variant={cycleConfig.badgeVariant}
            color={cycleConfig.badgeColor}
            size="md"
          />
        )}
      </td>

      <td>
        {ageRange && (
          <LabelBadge
            label={ageRange}
            icon={Calendar}
            variant="outlined"
            color="var(--color-2-nuance-2)"
            size="md"
          />
        )}
      </td>

      <td>
        <LabelBadge
          label={statusConfig.label}
          icon={StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="md"
        />
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(level.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(level.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(level.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
