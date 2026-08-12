import * as React from 'react';
import { GraduationCap, Calendar } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { LEVEL_STATUS_CONFIG, LEVEL_CYCLE_CONFIG } from './level-configs';
import type { Level } from '@/types/level.types';

interface LevelCardProps {
  level: Level;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const LevelCard: React.FC<LevelCardProps> = ({
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
    <TableCard onClick={() => onView?.(level.id)}>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-medium text-sm text-muted-foreground">{level.code}</span>
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
        <h3 className="font-semibold text-foreground text-base mb-2">{level.label}</h3>

        <div className="flex flex-wrap gap-2">
          {cycleConfig && CycleIcon && (
            <LabelBadge
              label={cycleConfig.label}
              icon={CycleIcon}
              variant={cycleConfig.badgeVariant}
              color={cycleConfig.badgeColor}
              size="sm"
            />
          )}

          {ageRange && (
            <LabelBadge
              label={ageRange}
              icon={Calendar}
              variant="outlined"
              color="var(--color-2-nuance-2)"
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
              onView?.(level.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(level.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(level.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
