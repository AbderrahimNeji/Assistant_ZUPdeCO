import * as React from 'react';
import { User, Mail, Phone, BookOpen, CalendarRange } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { VOLUNTEER_STATUS_CONFIG } from './volunteer-configs';
import type { Volunteer } from '@/types/volunteer.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';
import { useRoleConfig } from '@/hooks/useRoleConfig';
import { resolveBrandingColor } from '@/utils/branding';

interface VolunteerCardProps {
  volunteer: Volunteer;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const VolunteerCard: React.FC<VolunteerCardProps> = ({
  volunteer,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusKey = normalizeStaffAccountStatus(String(volunteer.status));
  const statusConfig = VOLUNTEER_STATUS_CONFIG[statusKey] || VOLUNTEER_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const subjectNames = volunteer.userProfiles?.[0]?.subjectNames || [];
  const subjectCount = Array.isArray(subjectNames) ? subjectNames.length : 0;
  const roleConfig = useRoleConfig();

  const handleClick = () => {
    onView?.(volunteer.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView?.(volunteer.id);
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
              {volunteer.firstName} {volunteer.lastName}
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-0.5">
              <LabelBadge
                label={statusConfig.label}
                icon={StatusIcon}
                variant={statusConfig.badgeVariant}
                color={statusConfig.badgeColor}
                size="sm"
              />
              {volunteer.userRoles?.map((ur) => {
                const config = roleConfig[ur.role.code.toUpperCase()];
                const RoleIcon = config?.icon;
                const badgeColor = resolveBrandingColor(config?.colorClass);
                return (
                  <LabelBadge
                    key={ur.role.code}
                    label={ur.role.label || config?.label || ur.role.code}
                    icon={RoleIcon}
                    variant="outlined"
                    color={badgeColor}
                    size="sm"
                  />
                );
              })}
            </div>
            {volunteer.displayName && (
              <span className="text-xs text-muted-foreground truncate mt-0.5">
                {volunteer.displayName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground truncate">{volunteer.email || 'N/R'}</span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{volunteer.phone || 'N/R'}</span>
        </div>

        <div className="flex items-center gap-2">
          <BookOpen
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--color-1-nuance-1)' }}
          />
          <span className="text-sm text-foreground">
            {subjectCount} matière{subjectCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CalendarRange
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--color-1-nuance-1)' }}
          />
          <span className="text-sm text-foreground">
            {volunteer.engagementDurationMonths ?? 0} mois
          </span>
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(volunteer.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(volunteer.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(volunteer.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
