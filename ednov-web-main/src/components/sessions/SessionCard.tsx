import * as React from 'react';
import { Calendar, Clock, Building2, FileEdit, UserCheck, Repeat2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import {
  SESSION_TYPE_CONFIG,
  SESSION_STATUS_CONFIG,
  SESSION_RECURRENCE_LABELS,
} from './session-configs';
import { useNavigateToReport } from '@/hooks/useNavigateToReport';
import { getRowPermission } from '@/hooks/usePageActions';
import type { SessionStatus } from '@/types/session.types';

interface Session {
  id: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  type: 'homework_help' | 'individual_tutoring' | 'workshop' | 'whole_class' | 'group_tutoring';
  status: SessionStatus;
  mode?: 'single' | 'recurring';
  recurrenceType?: string;
  recurrenceGroupId?: string | null;
  establishmentName?: string | null;
  establishment?: {
    name: string;
  };
  levelNames?: string[];
  subjectNames?: string[];
  _permissions?: Record<string, boolean>;
}

interface SessionCardProps {
  session: Session;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onManageAttendance?: (id: string) => void;
  pageActions?: {
    canEditRow?: boolean;
    canCancelRow?: boolean;
    canDeleteRow?: boolean;
  };
}

const formatTime = (time: string) => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

const getAttendanceTooltip = (
  onManageAttendance: ((id: string) => void) | undefined,
  isDisabled: boolean,
  status: Session['status'],
): string => {
  if (!onManageAttendance) return 'Indisponible';
  if (!isDisabled) return 'Gérer les présences';

  if (status === 'COMPLETED') return 'Séance terminée';
  if (status === 'CANCELLED') return 'Séance annulée';
  return 'Séance clôturée';
};

const getReportTooltip = (isLoading: boolean, status: Session['status']): string => {
  if (isLoading) return 'Chargement';

  if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    return 'Éditer le compte rendu';
  }

  if (status === 'PLANNED') return 'Séance non démarrée';
  if (status === 'CLOSED') return 'Séance clôturée';
  return 'Séance annulée';
};

const getEditTooltip = (
  isDisabled: boolean,
  status: Session['status'],
  isPast: boolean,
): string => {
  if (!isDisabled) return 'Modifier la séance';

  if (status === 'COMPLETED') return 'Modification impossible : séance terminée';
  if (status === 'CANCELLED') return 'Modification impossible : séance annulée';
  if (status === 'CLOSED') return 'Modification impossible : séance clôturée';
  if (isPast) return 'Modification impossible : séance passée';
  return 'Modification impossible';
};

const getCancelTooltip = (
  isDisabled: boolean,
  status: Session['status'],
  isPast: boolean,
): string => {
  if (!isDisabled) return 'Annuler la séance';
  if (status === 'CANCELLED') return 'Annulation impossible : séance déjà annulée';
  if (status === 'CLOSED') return 'Annulation impossible : séance clôturée';
  if (status === 'COMPLETED') return 'Annulation impossible : séance terminée';
  if (isPast) return 'Annulation impossible : séance passée';
  return 'Annulation impossible';
};

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onView,
  onEdit,
  onCancel,
  onManageAttendance,
  pageActions,
}) => {
  const canEdit = getRowPermission(session, 'action-edit-row', pageActions?.canEditRow ?? true);
  const canCancel = getRowPermission(
    session,
    'action-cancel-row',
    pageActions?.canCancelRow ?? true,
  );

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && pageActions && !(session as any)._permissions) {
      console.warn(
        `[SessionCard] session id=${session.id}: pageActions configured but _permissions is missing from API response. ` +
          'Check that @WithActionScopes is applied on GET /sessions and actionScopes are passed to findAll().',
      );
    }
  }, [session.id]);
  const typeConfig = SESSION_TYPE_CONFIG[session.type];
  const statusConfig = SESSION_STATUS_CONFIG[session.status] || SESSION_STATUS_CONFIG.PLANNED;
  const TypeIcon = typeConfig?.icon;
  const StatusIcon = statusConfig.icon;
  const { navigateToReport, isLoading: isLoadingReport } = useNavigateToReport();

  // POC-331: Une séance "passée" ou "terminée" ne doit plus afficher Modifier/Annuler
  const isPast = new Date(session.sessionDate) < new Date(new Date().toDateString());
  const isTerminated =
    isPast ||
    session.status === 'COMPLETED' ||
    session.status === 'CLOSED' ||
    session.status === 'CANCELLED';

  const attendanceDisabled =
    !onManageAttendance ||
    session.status === 'CLOSED' ||
    session.status === 'CANCELLED' ||
    session.status === 'COMPLETED';
  const reportDisabled =
    isLoadingReport || (session.status !== 'IN_PROGRESS' && session.status !== 'COMPLETED');
  const editDisabled = isTerminated;
  const cancelDisabled = isTerminated;

  return (
    <TableCard onClick={() => onView?.(session.id)}>
      <div className="data-card-header">
        <LabelBadge
          label={statusConfig.label}
          icon={statusConfig.isInProgress ? <span className="session-dot-pulse" /> : StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="sm"
        />
      </div>

      <div className="data-card-content" style={{ overflow: 'hidden' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-foreground text-sm">
              {format(new Date(session.sessionDate), 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 mb-2 min-h-0">
          <Building2
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: 'var(--color-1-nuance-1)' }}
          />
          <span className="text-sm text-foreground line-clamp-2 overflow-hidden">
            {(session.establishmentName ?? session.establishment?.name) || 'Non défini'}
          </span>
        </div>
        <div className="mt-auto">
          <div className="flex flex-col gap-1.5">
            <LabelBadge
              label={typeConfig?.label ?? session.type}
              icon={TypeIcon}
              variant={typeConfig?.badgeVariant ?? 'ghost'}
              color={typeConfig?.badgeColor ?? 'var(--color-2-nuance-1)'}
              size="sm"
            />
            {session.mode === 'recurring' && session.recurrenceType && (
              <LabelBadge
                label={SESSION_RECURRENCE_LABELS[session.recurrenceType] || session.recurrenceType}
                icon={Repeat2}
                variant="ghost"
                color="var(--color-1-nuance-1)"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(session.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(session.id);
              }}
              disabled={editDisabled}
              tooltipText={getEditTooltip(editDisabled, session.status, isPast)}
            />
          )}
          {onManageAttendance && (
            <Button
              variant="ghost"
              color="#7c3aed"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onManageAttendance?.(session.id);
              }}
              icon={UserCheck}
              disabled={attendanceDisabled}
              tooltipText={getAttendanceTooltip(
                onManageAttendance,
                attendanceDisabled,
                session.status,
              )}
            />
          )}
          <Button
            variant="ghost"
            color="var(--color-3-nuance-1)"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              navigateToReport(session.id);
            }}
            icon={FileEdit}
            disabled={reportDisabled}
            loading={isLoadingReport}
            tooltipText={getReportTooltip(isLoadingReport, session.status)}
          />
          {canCancel && (
            <Button
              preset="row-cancel"
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.(session.id);
              }}
              disabled={cancelDisabled}
              tooltipText={getCancelTooltip(cancelDisabled, session.status, isPast)}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
