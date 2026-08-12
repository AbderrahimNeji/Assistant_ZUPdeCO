import * as React from 'react';
import { User, Mail, Phone, BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { TUTOR_STATUS_CONFIG } from './tutor-configs';
import type { Tutor } from '@/types/tutor.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';
import { useRoleConfig } from '@/hooks/useRoleConfig';
import { resolveBrandingColor } from '@/utils/branding';

interface TutorCardProps {
  tutor: Tutor;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const TutorCard: React.FC<TutorCardProps> = ({
  tutor,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusKey = normalizeStaffAccountStatus(String(tutor.status));
  const statusConfig = TUTOR_STATUS_CONFIG[statusKey] || TUTOR_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const subjects = tutor.userProfiles?.[0]?.subjects || [];
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const roleConfig = useRoleConfig();

  return (
    <TableCard onClick={() => onView?.(tutor.id)}>
      <div className="data-card-content">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]">
            <User className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-foreground text-base truncate">
              {tutor.firstName} {tutor.lastName}
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-0.5">
              <LabelBadge
                label={statusConfig.label}
                icon={StatusIcon}
                variant={statusConfig.badgeVariant}
                color={statusConfig.badgeColor}
                size="sm"
              />
              {tutor.userRoles?.map((ur) => {
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground truncate">{tutor.email || 'N/R'}</span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{tutor.phone || 'N/R'}</span>
        </div>

        <div className="flex items-center gap-2">
          <LabelBadge
            label={`${subjectCount} matière${subjectCount > 1 ? 's' : ''}`}
            icon={BookOpen}
            variant="outlined"
            color="var(--color-3-nuance-1)"
            size="sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{tutor.hoursDone ?? 0} h</span>
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(tutor.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(tutor.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(tutor.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
