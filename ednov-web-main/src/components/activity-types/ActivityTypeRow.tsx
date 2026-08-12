import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { ACTIVITY_TYPE_STATUS_CONFIG } from './activity-type-configs';
import type { ActivityType } from '@/types/activity.types';

interface ActivityTypeRowProps {
  activityType: ActivityType;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ActivityTypeRow: React.FC<ActivityTypeRowProps> = ({
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
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{activityType.code}</span>
        </div>
      </td>

      <td>
        <span className="text-foreground">{activityType.label}</span>
      </td>

      <td>
        {activityType.description && (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {activityType.description}
          </span>
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
          <Button preset="row-view" onClick={() => onView?.(activityType.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(activityType.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(activityType.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
