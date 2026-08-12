import * as React from 'react';
import { Eye, Edit, Trash2, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import {
  SUBJECT_STATUS_CONFIG,
  SUBJECT_CYCLE_CONFIG,
  getEducationCycleLabelFr,
} from './subject-configs';
import type { Subject } from '@/types/subject.types';

interface SubjectRowProps {
  subject: Subject;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const SubjectRow: React.FC<SubjectRowProps> = ({
  subject,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = SUBJECT_STATUS_CONFIG[subject.status];
  const cycleConfig = subject.educationCycle ? SUBJECT_CYCLE_CONFIG[subject.educationCycle] : null;
  const StatusIcon = statusConfig.icon;
  const CycleIcon = cycleConfig?.icon;

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{subject.code}</span>
        </div>
      </td>

      <td>
        <span className="text-foreground">{subject.label}</span>
      </td>

      <td>
        {cycleConfig && CycleIcon ? (
          <LabelBadge
            label={cycleConfig.label}
            icon={CycleIcon}
            variant={cycleConfig.badgeVariant}
            color={cycleConfig.badgeColor}
            size="md"
          />
        ) : subject.educationCycle ? (
          <span className="text-sm text-foreground">
            {getEducationCycleLabelFr(subject.educationCycle)}
          </span>
        ) : null}
      </td>

      <td>
        {subject.isCore && (
          <LabelBadge
            label="Matière principale"
            icon={Star}
            variant="outlined"
            color="var(--color-2-nuance-1)"
            size="sm"
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
          <Button preset="row-view" onClick={() => onView?.(subject.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(subject.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(subject.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
