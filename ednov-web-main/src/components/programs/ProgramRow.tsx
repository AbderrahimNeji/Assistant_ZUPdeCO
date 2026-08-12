import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { PROGRAM_STATUS_CONFIG } from './program-configs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Program } from '@/types/program.types';

interface ProgramRowProps {
  program: Program;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ProgramRow: React.FC<ProgramRowProps> = ({
  program,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = PROGRAM_STATUS_CONFIG[program.status];
  const StatusIcon = statusConfig.icon;

  const dateRange =
    program.startDate && program.endDate
      ? `${format(new Date(program.startDate), 'dd/MM/yyyy', { locale: fr })} - ${format(new Date(program.endDate), 'dd/MM/yyyy', { locale: fr })}`
      : null;

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{program.code}</span>
        </div>
      </td>

      <td>
        <span className="text-foreground">{program.name}</span>
      </td>

      <td>
        {dateRange && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
              <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
            </div>
            <span className="text-sm text-foreground">{dateRange}</span>
          </div>
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
          <Button preset="row-view" onClick={() => onView?.(program.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(program.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(program.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
