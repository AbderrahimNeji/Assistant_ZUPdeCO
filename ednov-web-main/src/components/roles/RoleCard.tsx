import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { ROLE_STATUS_CONFIG, ROLE_MODE_CONFIG } from './role-configs';
import type { Role } from '@/types/role.types';

function resolveColorToken(token: string | null | undefined): string | undefined {
  if (!token) return undefined;
  if (token.startsWith('#') || token.startsWith('rgb') || token.startsWith('hsl')) return token;
  return `var(--${token})`;
}

interface RoleCardProps {
  role: Role;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: {
    canEditRow?: boolean;
    canDeleteRow?: boolean;
  };
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = ROLE_STATUS_CONFIG[role.status];
  const modeConfig = role.mode ? ROLE_MODE_CONFIG[role.mode] : null;
  const StatusIcon = statusConfig.icon;
  const ModeIcon = modeConfig?.icon;

  return (
    <TableCard onClick={() => onView?.(role.id)}>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <DynamicIcon
            name={role.icon ?? 'Shield'}
            className="w-5 h-5 shrink-0"
            style={{ color: resolveColorToken(role.color) }}
          />
          <span className="font-medium text-sm text-muted-foreground">{role.code}</span>
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
        <h3 className="font-semibold text-foreground text-base mb-2">{role.label}</h3>

        <div className="flex flex-wrap gap-2">
          {role.roleGroup && (
            <LabelBadge
              variant="outlined"
              color={role.roleGroupColor ?? undefined}
              label={role.roleGroupLabel ?? role.roleGroup}
              size="sm"
            />
          )}

          {role.hierarchyLevel != null && (
            <LabelBadge variant="outlined" label={`Niveau ${role.hierarchyLevel}`} size="sm" />
          )}

          {modeConfig && ModeIcon && (
            <LabelBadge
              label={modeConfig.label}
              icon={ModeIcon}
              variant={modeConfig.badgeVariant}
              color={modeConfig.badgeColor}
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
              onView?.(role.id);
            }}
          />
          {canEdit && !role.isSystem && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(role.id);
              }}
            />
          )}
          {canDelete && !role.isSystem && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(role.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
