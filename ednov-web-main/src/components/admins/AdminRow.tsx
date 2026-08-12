import * as React from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { ADMIN_STATUS_CONFIG } from './admin-configs';
import type { Admin } from '@/types/admin.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';
import type { InterfaceElementResponseDto } from '@/types/interface-elements.types';
import { useRoleConfig } from '@/hooks/useRoleConfig';
import { resolveBrandingColor } from '@/utils/branding';

interface AdminRowProps {
  admin: Admin;
  interfaceElements: InterfaceElementResponseDto[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const AdminRow: React.FC<AdminRowProps> = ({
  admin,
  interfaceElements,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusKey = normalizeStaffAccountStatus(String(admin.status));
  const statusConfig = ADMIN_STATUS_CONFIG[statusKey] || ADMIN_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;
  const roleConfig = useRoleConfig();

  const adminRoles = admin.userRoles?.map((ur) => ur.role.code) || [];

  const canEdit = React.useMemo(() => {
    const adminRoleCodes = admin.userRoles?.map((ur) => ur.role.code) || [];
    const primaryRoleCode = adminRoleCodes[0] || 'admin';

    return interfaceElements.some(
      (el) =>
        el.elementType === 'action' &&
        (el.config as any)?.subtype === 'edit-role' &&
        (el.config as any)?.targetRole === primaryRoleCode,
    );
  }, [admin.userRoles, interfaceElements]);

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <User className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-medium text-foreground">
            {admin.firstName} {admin.lastName}
          </span>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{admin.email || 'N/R'}</span>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{admin.phone || 'N/R'}</span>
        </div>
      </td>

      <td>
        <div className="flex flex-wrap gap-1">
          {adminRoles.map((roleCode) => {
            const config = roleConfig[roleCode.toUpperCase()];
            const RoleIcon = config?.icon;
            const badgeColor = resolveBrandingColor(config?.colorClass);
            return (
              <LabelBadge
                key={roleCode}
                label={config?.label ?? roleCode}
                icon={RoleIcon}
                variant="outlined"
                color={badgeColor}
                size="md"
              />
            );
          })}
        </div>
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
          <Button preset="row-view" onClick={() => onView?.(admin.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(admin.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(admin.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
