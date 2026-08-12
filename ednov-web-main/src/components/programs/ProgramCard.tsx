import * as React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { PROGRAM_STATUS_CONFIG } from './program-configs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Program } from '@/types/program.types';

interface ProgramCardProps {
  program: Program;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ProgramCard: React.FC<ProgramCardProps> = ({
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
    <TableCard onClick={() => onView?.(program.id)}>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <FileText className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-medium text-sm text-muted-foreground">{program.code}</span>
        </div>
        <LabelBadge
          label={statusConfig.label}
          icon={StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="sm"
        />
      </div>

      <div className="data-card-content">
        <h3 className="font-semibold text-foreground text-base mb-2">{program.name}</h3>

        {dateRange && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
              <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
            </div>
            <span className="text-sm text-foreground">{dateRange}</span>
          </div>
        )}
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(program.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(program.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(program.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
