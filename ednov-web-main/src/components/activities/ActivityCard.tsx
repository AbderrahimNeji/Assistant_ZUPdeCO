import * as React from 'react';
import { Tag, Zap } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import {
  ACTIVITY_STATUS_CONFIG,
  formatActivityMaxCell,
  formatActivityOptionsCell,
} from './activity-configs';
import type { Activity } from '@/types/activity.types';

interface ActivityCardProps {
  activity: Activity;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
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
    <TableCard onClick={() => onView?.(activity.id)}>
      <div className="data-card-content">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Tag className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground text-sm">{activity.label}</span>
            <span className="text-xs text-muted-foreground">{activity.code}</span>
          </div>
        </div>

        {activity.activityTypeName || activity.activityType?.label ? (
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
            <span className="text-sm text-foreground">
              {activity.activityTypeName || activity.activityType?.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Type non défini</span>
          </div>
        )}

        <div className="mt-2">
          <LabelBadge
            label={statusConfig.label}
            icon={StatusIcon}
            variant={statusConfig.badgeVariant}
            color={statusConfig.badgeColor}
            size="sm"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground border-t border-[color-mix(in_srgb,var(--foreground)_8%,transparent)] pt-3">
          <span>Max tuteurs : {formatActivityMaxCell(activity.maxTutors)}</span>
          <span>Max élèves : {formatActivityMaxCell(activity.maxStudents)}</span>
          <span>Max VSC : {formatActivityMaxCell(activity.maxVolunteers)}</span>
          <span>Max él./tuteur : {formatActivityMaxCell(activity.maxStudentsPerTutor)}</span>
          <span className="col-span-2 line-clamp-2" title={formatActivityOptionsCell(activity)}>
            Options : {formatActivityOptionsCell(activity)}
          </span>
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(activity.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(activity.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(activity.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
