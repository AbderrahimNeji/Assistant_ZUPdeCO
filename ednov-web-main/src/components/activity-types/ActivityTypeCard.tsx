import * as React from 'react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { ACTIVITY_TYPE_STATUS_CONFIG } from './activity-type-configs';
import type { ActivityType } from '@/types/activity.types';

interface ActivityTypeCardProps {
  activityType: ActivityType;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ActivityTypeCard: React.FC<ActivityTypeCardProps> = ({
  activityType,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = ACTIVITY_TYPE_STATUS_CONFIG[activityType.status];
  const StatusIcon = statusConfig.icon;

  return (
    <TableCard onClick={() => onView?.(activityType.id)}>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Tag className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-medium text-sm text-muted-foreground">{activityType.code}</span>
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
        <h3 className="font-semibold text-foreground text-base mb-2">{activityType.label}</h3>

        {activityType.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{activityType.description}</p>
        )}
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(activityType.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(activityType.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(activityType.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
