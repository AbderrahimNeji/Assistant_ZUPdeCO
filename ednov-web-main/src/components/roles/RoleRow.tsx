import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { ROLE_STATUS_CONFIG, ROLE_MODE_CONFIG } from './role-configs';
import type { Role } from '@/types/role.types';

function resolveColorToken(token: string | null | undefined): string | undefined {
  if (!token) return undefined;
  if (token.startsWith('#') || token.startsWith('rgb') || token.startsWith('hsl')) return token;
  return `var(--${token})`;
}

interface RoleRowProps {
  role: Role;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: {
    canEditRow?: boolean;
    canDeleteRow?: boolean;
  };
}

export const RoleRow: React.FC<RoleRowProps> = ({
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
    <TableRow>
      <td>
        <div className="flex items-center gap-3">
          <DynamicIcon
            name={role.icon ?? 'Shield'}
            className="h-5 w-5 shrink-0"
            style={{ color: resolveColorToken(role.color) }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{role.label}</span>
            <span className="text-xs text-muted-foreground font-mono">{role.code}</span>
          </div>
        </div>
      </td>

      <td>
        {role.roleGroup && (
          <LabelBadge
            variant="outlined"
            color={role.roleGroupColor ?? undefined}
            label={role.roleGroupLabel ?? role.roleGroup}
            size="md"
          />
        )}
      </td>

      <td>
        {role.hierarchyLevel != null ? (
          <span className="text-sm tabular-nums text-foreground">#{role.hierarchyLevel}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>

      <td>
        {modeConfig && ModeIcon ? (
          <LabelBadge
            label={modeConfig.label}
            icon={ModeIcon}
            variant={modeConfig.badgeVariant}
            color={modeConfig.badgeColor}
            size="md"
          />
        ) : null}
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
          <Button preset="row-view" onClick={() => onView?.(role.id)} />

          {canEdit && !role.isSystem && (
            <Button preset="row-edit" onClick={() => onEdit?.(role.id)} />
          )}

          {canDelete && !role.isSystem && (
            <Button preset="row-delete" onClick={() => onDelete?.(role.id)} />
          )}
        </div>
      </td>
    </TableRow>
  );
};
