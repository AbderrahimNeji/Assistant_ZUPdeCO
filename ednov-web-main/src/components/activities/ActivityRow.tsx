import * as React from 'react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import {
  ACTIVITY_STATUS_CONFIG,
  formatActivityMaxCell,
  formatActivityOptionsCell,
} from './activity-configs';
import type { Activity } from '@/types/activity.types';

interface ActivityRowProps {
  activity: Activity;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ActivityRow: React.FC<ActivityRowProps> = ({
  activity,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = ACTIVITY_STATUS_CONFIG[activity.status];
  const StatusIcon = statusConfig.icon;

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{activity.code}</span>
        </div>
      </td>

      <td>
        <span className="text-foreground">{activity.label}</span>
      </td>

      <td>
        {activity.activityTypeName || activity.activityType?.label ? (
          <LabelBadge
            label={activity.activityTypeName || activity.activityType?.label || ''}
            icon={Tag}
            variant="outlined"
            color="var(--color-1-nuance-1)"
            size="md"
          />
        ) : (
          <span className="text-sm text-muted-foreground">Non défini</span>
        )}
      </td>

      <td>
        {activity.description && (
          <span className="text-sm text-muted-foreground line-clamp-1">{activity.description}</span>
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

      <td className="text-sm text-muted-foreground tabular-nums text-center">
        {formatActivityMaxCell(activity.maxTutors)}
      </td>
      <td className="text-sm text-muted-foreground tabular-nums text-center">
        {formatActivityMaxCell(activity.maxStudents)}
      </td>
      <td className="text-sm text-muted-foreground tabular-nums text-center">
        {formatActivityMaxCell(activity.maxVolunteers)}
      </td>
      <td className="text-sm text-muted-foreground tabular-nums text-center">
        {formatActivityMaxCell(activity.maxStudentsPerTutor)}
      </td>
      <td>
        <span
          className="text-sm text-muted-foreground line-clamp-2"
          title={formatActivityOptionsCell(activity)}
        >
          {formatActivityOptionsCell(activity)}
        </span>
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(activity.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(activity.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(activity.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
