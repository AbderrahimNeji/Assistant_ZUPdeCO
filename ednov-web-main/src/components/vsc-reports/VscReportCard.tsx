import * as React from 'react';
import { Calendar, User, UserCheck, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { getRowPermission } from '@/hooks/usePageActions';
import { VSC_REPORT_STATUS_CONFIG, VSC_REPORT_CATEGORY_CONFIG } from './vsc-report-configs';
import type { VscReport } from '@/types/vsc-report.types';

interface VscReportCardProps {
  report: VscReport;
  onView?: (reportId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onValidate?: () => void;
  canValidate?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean; canViewRow?: boolean };
}

export const VscReportCard: React.FC<VscReportCardProps> = ({
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
        `[VscReportCard] report id=${report.id}: pageActions configured but _permissions missing. ` +
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

  const sessionDisplayText =
    report.sessionDisplayName ||
    (report.session?.sessionDate
      ? format(new Date(report.session.sessionDate), 'd MMM yyyy', { locale: fr })
      : 'Date inconnue');

  return (
    <TableCard
      onClick={() => {
        if (canViewRow) onView?.(report.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (canViewRow) onView?.(report.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="data-card-header">
        {/* Empty header - status badge moved to content section */}
      </div>

      <div className="data-card-content">
        {/* Session Info with Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center flex-wrap" style={{ gap: '0.5rem' }}>
              <span className="font-medium text-foreground text-sm">{sessionDisplayText}</span>
              {/* Badge Statut - moved next to session date with proper spacing */}
              <LabelBadge
                label={statusConfig.label}
                icon={StatusIcon}
                variant={statusConfig.badgeVariant}
                color={statusConfig.badgeColor}
                size="sm"
              />
              {/* Badge Catégorie */}
              {report.category && VSC_REPORT_CATEGORY_CONFIG[report.category] && (
                <LabelBadge
                  label={VSC_REPORT_CATEGORY_CONFIG[report.category].label}
                  icon={VSC_REPORT_CATEGORY_CONFIG[report.category].icon}
                  variant={VSC_REPORT_CATEGORY_CONFIG[report.category].badgeVariant}
                  color={VSC_REPORT_CATEGORY_CONFIG[report.category].badgeColor}
                  size="sm"
                />
              )}
            </div>
            {report.session?.establishment?.name && (
              <span className="text-xs text-muted-foreground">
                {report.session.establishment.name}
              </span>
            )}
          </div>
        </div>

        {/* Élève : masqué pour les rapports journaliers (pas d’élève lié) */}
        {!report.isDailyReport && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]">
              <User className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
            </div>
            <span className="text-sm text-foreground">{studentName}</span>
          </div>
        )}

        {/* Volunteer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)]">
            <UserCheck className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
          </div>
          <span className="text-sm text-foreground">{volunteerName}</span>
        </div>

        {/* Summary Preview */}
        {report.summary && (
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-foreground line-clamp-2">{report.summary}</p>
          </div>
        )}
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          {canViewRow && onView && (
            <Button
              preset="row-view"
              onClick={(e) => {
                e.stopPropagation();
                onView(report.id);
              }}
            />
          )}
          {canEditRow && onEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                onValidate?.();
              }}
            />
          )}
          {canDelete && onDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
