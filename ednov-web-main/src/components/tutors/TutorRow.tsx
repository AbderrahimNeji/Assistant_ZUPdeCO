import * as React from 'react';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  CalendarDays,
  Timer,
  Target,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { TUTOR_STATUS_CONFIG } from './tutor-configs';
import type { Tutor } from '@/types/tutor.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';
import { useRoleConfig } from '@/hooks/useRoleConfig';
import { resolveBrandingColor } from '@/utils/branding';

interface TutorRowProps {
  tutor: Tutor;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function computeSeniority(startDate: Date | string | null | undefined): string {
  if (!startDate) return '—';
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return '—';
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 1) return '< 1 mois';
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0
    ? `${years} an${years > 1 ? 's' : ''} ${rem} mois`
    : `${years} an${years > 1 ? 's' : ''}`;
}

export const TutorRow: React.FC<TutorRowProps> = ({
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
  const roleConfig = useRoleConfig();

  const profile = tutor.userProfiles?.[0];
  const subjects = profile?.subjects || [];
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;

  const engagementStartDate = profile?.engagementStartDate;
  const exitDate = profile?.exitDate;
  const targetHours = profile?.targetHours;

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <User className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {tutor.firstName} {tutor.lastName}
            </span>
            {tutor.displayName && (
              <span className="text-xs text-muted-foreground">{tutor.displayName}</span>
            )}
          </div>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{tutor.email || 'N/R'}</span>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">{tutor.phone || 'N/R'}</span>
        </div>
      </td>

      <td>
        <div className="flex flex-wrap gap-1">
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
      </td>

      <td>
        <div className="flex items-center gap-2">
          <LabelBadge
            label={`${subjectCount} matière${subjectCount > 1 ? 's' : ''}`}
            icon={BookOpen}
            variant="outlined"
            color="var(--color-3-nuance-1)"
            size="sm"
          />
        </div>
      </td>

      <td className="!px-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground whitespace-nowrap">
            {formatShortDate(engagementStartDate)}
          </span>
        </div>
      </td>

      <td className="!px-3">
        <span className="text-sm text-foreground whitespace-nowrap">
          {computeSeniority(engagementStartDate)}
        </span>
      </td>

      <td className="text-center !px-3">
        <div className="flex items-center gap-1 justify-center">
          <Timer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground whitespace-nowrap">
            {tutor.hoursDone ?? 0} h
          </span>
        </div>
      </td>

      <td className="text-center !px-3">
        <div className="flex items-center gap-1 justify-center">
          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground whitespace-nowrap">
            {targetHours != null ? `${targetHours} h` : '—'}
          </span>
        </div>
      </td>

      <td className="!px-3">
        <div className="flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground whitespace-nowrap">
            {formatShortDate(exitDate)}
          </span>
        </div>
      </td>

      <td className="text-center !px-3">
        <div className="flex items-center gap-1 justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground whitespace-nowrap">
            {tutor.attendanceRate != null ? `${tutor.attendanceRate}%` : '—'}
          </span>
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
          <Button preset="row-view" onClick={() => onView?.(tutor.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(tutor.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(tutor.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
