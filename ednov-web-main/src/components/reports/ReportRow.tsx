import * as React from 'react';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/forms/Button';
import { Rating } from '@/components/forms/Rating';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { getRowPermission } from '@/hooks/usePageActions';
import { REPORT_STATUS_CONFIG } from './report-configs';
import type { SessionReport } from '@/types/report.types';
import { getReportDisplayRating } from '@/utils/report-author-feedback';

interface ReportRowProps {
  report: SessionReport;
  onView?: (reportId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onValidate?: () => void;
  canValidate?: boolean;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const ReportRow: React.FC<ReportRowProps> = ({
  report,
  onView,
  onEdit,
  onDelete,
  onValidate,
  canValidate,
  pageActions,
}) => {
  const canEdit = getRowPermission(report, 'action-edit-row', pageActions?.canEditRow ?? true);
  const canDelete = getRowPermission(
    report,
    'action-delete-row',
    pageActions?.canDeleteRow ?? true,
  );

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && pageActions && !(report as any)._permissions) {
      console.warn(
        `[ReportRow] report id=${report.id}: pageActions configured but _permissions missing. ` +
          'Check @WithActionScopes on GET /sessions/:id/reports.',
      );
    }
  }, [report.id]);
  const statusConfig = REPORT_STATUS_CONFIG[report.status] || REPORT_STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const authorName =
    report.authorName ||
    report.author?.displayName ||
    [report.author?.firstName, report.author?.lastName].filter(Boolean).join(' ') ||
    'Auteur inconnu';

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

      {/* Auteur */}
      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]">
            <User className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
          </div>
          <span className="text-foreground">{authorName}</span>
        </div>
      </td>

      {/* Note */}
      <td>
        {(() => {
          const meanRating = getReportDisplayRating(report);
          return meanRating === null ? (
            <span className="text-sm text-muted-foreground">Non noté</span>
          ) : (
            <Rating value={meanRating} readOnly size="sm" showLabel={false} />
          );
        })()}
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

      {/* Date de soumission */}
      <td>
        <span className="text-sm text-foreground">{createdDate}</span>
      </td>

      {/* Actions */}
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(report.id)} />

          {canEdit && (
            <Button
              preset="row-edit"
              disabled={report.status === 'validated'}
              tooltipText={
                report.status === 'validated'
                  ? 'Le compte rendu validé ne peut plus être modifié'
                  : 'Modifier le compte rendu'
              }
              onClick={() => onEdit?.()}
            />
          )}

          {canValidate && (
            <Button
              preset="row-validate"
              disabled={report.status !== 'submitted'}
              tooltipText={
                report.status === 'submitted'
                  ? 'Valider le compte rendu'
                  : 'Le compte rendu doit être soumis pour être validé'
              }
              onClick={() => onValidate?.()}
            />
          )}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.()} />}
        </div>
      </td>
    </TableRow>
  );
};
