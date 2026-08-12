import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { SPECIALTY_STATUS_CONFIG } from './specialty-configs';
import type { Specialty } from '@/services/specialties.service';

interface SpecialtyRowProps {
  specialty: Specialty;
  onEdit?: (id: string) => void;
  onDelete?: (specialty: Specialty) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const SpecialtyRow: React.FC<SpecialtyRowProps> = ({
  specialty,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canToggle = pageActions?.canDeleteRow ?? true;

  const statusKey = specialty.isActive ? 'active' : 'inactive';
  const statusConfig = SPECIALTY_STATUS_CONFIG[statusKey];
  const StatusIcon = statusConfig.icon;

  return (
    <TableRow>
      <td>
        <span className="font-mono text-sm text-muted-foreground">{specialty.code}</span>
      </td>

      <td>
        <span className="font-medium text-foreground">{specialty.label}</span>
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
          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(specialty.id)} />}
          {canToggle && <Button preset="row-delete" onClick={() => onDelete?.(specialty)} />}
        </div>
      </td>
    </TableRow>
  );
};
