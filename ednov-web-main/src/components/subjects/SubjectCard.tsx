import * as React from 'react';
import { BookOpen, Star } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import {
  SUBJECT_STATUS_CONFIG,
  SUBJECT_CYCLE_CONFIG,
  getEducationCycleLabelFr,
} from './subject-configs';
import type { Subject } from '@/types/subject.types';

interface SubjectCardProps {
  subject: Subject;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
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
    <TableCard onClick={() => onView?.(subject.id)}>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <BookOpen className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-medium text-sm text-muted-foreground">{subject.code}</span>
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
        <h3 className="font-semibold text-foreground text-base mb-2">{subject.label}</h3>

        <div className="flex flex-wrap gap-2">
          {cycleConfig && CycleIcon ? (
            <LabelBadge
              label={cycleConfig.label}
              icon={CycleIcon}
              variant={cycleConfig.badgeVariant}
              color={cycleConfig.badgeColor}
              size="sm"
            />
          ) : subject.educationCycle ? (
            <span className="text-sm text-muted-foreground">
              {getEducationCycleLabelFr(subject.educationCycle)}
            </span>
          ) : null}

          {subject.isCore && (
            <LabelBadge
              label="Matière principale"
              icon={Star}
              variant="outlined"
              color="var(--color-2-nuance-1)"
              size="sm"
            />
          )}
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(subject.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(subject.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(subject.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
