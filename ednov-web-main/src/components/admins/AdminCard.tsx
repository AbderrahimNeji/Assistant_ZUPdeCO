import * as React from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { ADMIN_STATUS_CONFIG } from './admin-configs';
import type { Admin } from '@/types/admin.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';
import type { InterfaceElementResponseDto } from '@/types/interface-elements.types';
import { useRoleConfig } from '@/hooks/useRoleConfig';
import { resolveBrandingColor } from '@/utils/branding';

interface AdminCardProps {
  admin: Admin;
  interfaceElements: InterfaceElementResponseDto[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const AdminCard: React.FC<AdminCardProps> = ({
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

    return !!interfaceElements.find(
      (el) =>
        el.elementType === 'action' &&
        (el.config as any)?.subtype === 'edit-role' &&
        (el.config as any)?.targetRole === primaryRoleCode,
    );
  }, [admin.userRoles, interfaceElements]);

  const handleClick = () => {
    onView?.(admin.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView?.(admin.id);
    }
  };

  return (
    <TableCard onClick={handleClick} onKeyDown={handleKeyDown} role="button" tabIndex={0}>
      <div className="data-card-content">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]">
            <User className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-foreground text-base truncate">
              {admin.firstName} {admin.lastName}
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-0.5">
              <LabelBadge
                label={statusConfig.label}
                icon={StatusIcon}
                variant={statusConfig.badgeVariant}
                color={statusConfig.badgeColor}
                size="sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground truncate">{admin.email || 'N/R'}</span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{admin.phone || 'N/R'}</span>
        </div>

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
                size="sm"
              />
            );
          })}
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(admin.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(admin.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(admin.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
