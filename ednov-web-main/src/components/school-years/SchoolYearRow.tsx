import * as React from 'react';
import { Eye, Edit, Trash2, Calendar, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { SCHOOL_YEAR_STATUS_CONFIG } from './school-year-configs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SchoolYear } from '@/types/school-year.types';

interface SchoolYearRowProps {
  schoolYear: SchoolYear;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const SchoolYearRow: React.FC<SchoolYearRowProps> = ({
  schoolYear,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusConfig = SCHOOL_YEAR_STATUS_CONFIG[schoolYear.status];
  const StatusIcon = statusConfig.icon;

  const start = new Date(schoolYear.startDate);
  const end = new Date(schoolYear.endDate);
  const startLabel = format(start, 'dd/MM/yyyy', { locale: fr });
  const endLabel = format(end, 'dd/MM/yyyy', { locale: fr });

  const nowTs = Date.now();
  const startMs = start.getTime();
  const endMs = end.getTime();
  const spanMs = Math.max(1, endMs - startMs);
  const progress = Math.min(1, Math.max(0, (nowTs - startMs) / spanMs));
  const isInCycle = nowTs >= startMs && nowTs <= endMs;
  const showNowMarker = isInCycle;

  let periodPhase: 'upcoming' | 'active' | 'ended';
  if (nowTs < startMs) periodPhase = 'upcoming';
  else if (nowTs > endMs) periodPhase = 'ended';
  else periodPhase = 'active';

  return (
    <TableRow>
      <td className="align-middle py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{schoolYear.code}</span>
            {periodPhase === 'upcoming' && (
              <LabelBadge
                label="À venir"
                icon={CalendarClock}
                variant="ghost"
                color="var(--color-2-nuance-1)"
                size="sm"
                className="mt-1"
              />
            )}
            {periodPhase === 'ended' && (
              <LabelBadge
                label="Terminée"
                icon={CheckCircle2}
                variant="ghost"
                color="rgb(var(--color-error))"
                size="sm"
                className="mt-1"
              />
            )}
            {periodPhase === 'active' && (
              <LabelBadge
                label="En cours"
                icon={Clock}
                variant="ghost"
                color="var(--color-1-nuance-1)"
                size="sm"
                className="mt-1"
              />
            )}
          </div>
        </div>
      </td>

      <td className="min-w-[19rem] max-w-[24rem] align-middle py-3">
        <div className="flex w-full min-w-0 max-w-[24rem] flex-col justify-center" aria-hidden>
          <div className="flex w-full min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-sm font-normal tabular-nums tracking-tight text-muted-foreground">
              {startLabel}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-0">
              <div
                className="size-2 shrink-0 rounded-full border-2 border-[var(--color-2-nuance-1)] bg-background shadow-sm"
                aria-hidden
              />
              <div className="relative flex min-h-5 min-w-[1.5rem] flex-1 items-center">
                <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[var(--color-2-nuance-1)]" />
                {showNowMarker && (
                  <div
                    className="absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-1-nuance-3)]"
                    style={{ left: `${progress * 100}%` }}
                    title="Position actuelle dans l’année"
                  />
                )}
              </div>
              <div
                className="size-2 shrink-0 rounded-full border-2 border-[var(--color-2-nuance-1)] bg-background shadow-sm"
                aria-hidden
              />
            </div>
            <span className="shrink-0 text-sm font-normal tabular-nums tracking-tight text-muted-foreground">
              {endLabel}
            </span>
          </div>
        </div>
        <span className="sr-only">
          Période : du {startLabel} au {endLabel}
          {showNowMarker ? ', nous sommes actuellement dans cette période.' : '.'}
        </span>
      </td>

      <td className="align-middle py-3">
        <LabelBadge
          label={statusConfig.label}
          icon={StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="md"
        />
      </td>

      <td className="align-middle py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(schoolYear.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(schoolYear.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(schoolYear.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
