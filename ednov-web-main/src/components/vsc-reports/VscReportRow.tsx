import * as React from 'react';
import { Calendar, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { getRowPermission } from '@/hooks/usePageActions';
import { VSC_REPORT_STATUS_CONFIG, VSC_REPORT_CATEGORY_CONFIG } from './vsc-report-configs';
import type { VscReport } from '@/types/vsc-report.types';
import { cn } from '@/lib/utils';

interface VscReportRowProps {
  report: VscReport;
  onView?: (reportId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onValidate?: () => void;
  canValidate?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canViewRow?: boolean };
}

export const VscReportRow: React.FC<VscReportRowProps> = ({
  report,
  onView,
  onEdit,
  onDelete,
  onValidate,
  canValidate = false,
  pageActions,
}) => {
  const canDelete = getRowPermission(
    report,
    'action-delete-row',
    pageActions?.canDeleteRow ?? true,
  );
  const canViewRow = getRowPermission(report, 'action-view-row', pageActions?.canViewRow ?? true);
  const canEditRow = getRowPermission(report, 'action-edit-row', pageActions?.canEditRow ?? false);

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && pageActions && !(report as any)._permissions) {
      console.warn(
        `[VscReportRow] report id=${report.id}: pageActions configured but _permissions missing. ` +
          'Check @WithActionScopes on GET /sessions/:id/vsc-reports.',
      );
    }
  }, [report.id]);
  const statusConfig = VSC_REPORT_STATUS_CONFIG[report.status];
  const StatusIcon = statusConfig.icon;

  const studentName = report.studentName || report.student?.displayName || 'Élève inconnu';

  const volunteerName =
    report.volunteerName ||
    report.volunteer?.displayName ||
    [report.volunteer?.firstName, report.volunteer?.lastName].filter(Boolean).join(' ') ||
    'VSC inconnu';

  const sessionDisplayText = report.session?.sessionDate
    ? format(new Date(report.session.sessionDate), 'd MMM yyyy', { locale: fr })
    : report.sessionDisplayName || 'Date inconnue';

  const createdDate = format(new Date(report.createdAt), 'd MMM yyyy', { locale: fr });

  return (
    <TableRow>
      {/* Séance */}
      <td>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
              <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
            </div>
            <span className="font-medium text-foreground">{sessionDisplayText}</span>
          </div>
          {report.session?.establishment?.name && (
            <div className="ml-10">
              <span className="text-sm text-muted-foreground">
                {report.session.establishment.name}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Élève (rapports séance uniquement ; les lignes journalières n’ont pas d’élève) */}
      {!report.isDailyReport && (
        <td>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]">
              <User className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
            </div>
            <span className="text-foreground">{studentName}</span>
          </div>
        </td>
      )}

      {/* VSC */}
      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)]">
            <UserCheck className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
          </div>
          <span className="text-foreground">{volunteerName}</span>
        </div>
      </td>

      {/* Statut */}
      <td>
        <LabelBadge
          label={statusConfig.label}
          icon={StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="md"
        />
      </td>

      {/* Catégorie */}
      <td>
        {report.category && VSC_REPORT_CATEGORY_CONFIG[report.category] ? (
          <LabelBadge
            label={VSC_REPORT_CATEGORY_CONFIG[report.category].label}
            icon={VSC_REPORT_CATEGORY_CONFIG[report.category].icon}
            variant={VSC_REPORT_CATEGORY_CONFIG[report.category].badgeVariant}
            color={VSC_REPORT_CATEGORY_CONFIG[report.category].badgeColor}
            size="sm"
          />
        ) : (
          <span className="text-muted-foreground text-sm">Manuel</span>
        )}
      </td>

      {/* Date de création */}
      <td>
        <span className="text-sm text-foreground">{createdDate}</span>
      </td>

      {/* Actions */}
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          {canViewRow && onView && (
            <Button
              preset="row-view"
              className={cn(
                'opacity-100',
                'border border-[color-mix(in_srgb,var(--color-1-nuance-3)_40%,transparent)]',
                'hover:border-[var(--color-2-nuance-1)] hover:text-[var(--color-2-nuance-1)]',
              )}
              onClick={() => onView(report.id)}
            />
          )}

          {canEditRow && onEdit && (
            <Button
              preset="row-edit"
              className={cn(
                'opacity-100',
                'border border-[color-mix(in_srgb,var(--color-1-nuance-3)_40%,transparent)]',
                'hover:border-[var(--color-1-nuance-1)] hover:text-[var(--color-1-nuance-1)]',
              )}
              onClick={() => onEdit()}
            />
          )}

          {canValidate && (
            <Button
              preset="row-validate"
              disabled={report.status !== 'submitted'}
              tooltipText={
                report.status === 'validated'
                  ? 'Ce rapport est déjà validé'
                  : report.status === 'submitted'
                    ? 'Valider le rapport'
                    : 'Le rapport doit être soumis pour être validé'
              }
              onClick={() => onValidate?.()}
            />
          )}

          {canDelete && onDelete && (
            <Button preset="row-delete" className="opacity-100" onClick={onDelete} />
          )}
        </div>
      </td>
    </TableRow>
  );
};
