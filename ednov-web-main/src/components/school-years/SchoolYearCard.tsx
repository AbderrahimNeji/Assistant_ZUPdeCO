import * as React from 'react';
import { Calendar, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { SCHOOL_YEAR_STATUS_CONFIG } from './school-year-configs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SchoolYear } from '@/types/school-year.types';

interface SchoolYearCardProps {
  schoolYear: SchoolYear;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const SchoolYearCard: React.FC<SchoolYearCardProps> = ({
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
  /** Position « maintenant » sur la frise tant qu’on est dans l’intervalle (cycle calendaire). */
  const showNowMarker = isInCycle;

  let periodPhase: 'upcoming' | 'active' | 'ended';
  if (nowTs < startMs) periodPhase = 'upcoming';
  else if (nowTs > endMs) periodPhase = 'ended';
  else periodPhase = 'active';

  return (
    <TableCard onClick={() => onView?.(schoolYear.id)}>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-semibold text-foreground text-base">{schoolYear.code}</span>
        </div>
        <LabelBadge
          label={statusConfig.label}
          icon={StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="sm"
        />
      </div>

      <div className="data-card-content">
        {/* Hauteur réservée : le « Période » reste aligné pareil avec ou sans badge */}
        <div className="mb-1 flex min-h-8 items-center">
          {periodPhase === 'upcoming' && (
            <LabelBadge
              label="À venir"
              icon={CalendarClock}
              variant="ghost"
              color="var(--color-2-nuance-1)"
              size="sm"
            />
          )}
          {periodPhase === 'ended' && (
            <LabelBadge
              label="Terminée"
              icon={CheckCircle2}
              variant="ghost"
              color="rgb(var(--color-error))"
              size="sm"
            />
          )}
          {periodPhase === 'active' && (
            <LabelBadge
              label="En cours"
              icon={Clock}
              variant="ghost"
              color="var(--color-1-nuance-1)"
              size="sm"
            />
          )}
        </div>

        {/* Étroit horizontalement (ne s’étire pas sur toute la carte), taille de contenu lisible */}
        <div
          className="flex w-full max-w-[min(17rem,100%)] flex-col gap-1 min-w-0 self-start"
          aria-hidden
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Période
          </p>
          <div className="flex w-full flex-col gap-0.5">
            {/* Ligne pleine entre les deux boules (même axe), couleur nuance 1 */}
            <div className="flex w-full items-center gap-0">
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
            <div className="flex w-full justify-between gap-2">
              <span className="text-sm font-normal tabular-nums tracking-tight text-muted-foreground">
                {startLabel}
              </span>
              <span className="text-sm font-normal tabular-nums tracking-tight text-muted-foreground">
                {endLabel}
              </span>
            </div>
          </div>
        </div>
        <span className="sr-only">
          Période : du {startLabel} au {endLabel}
          {showNowMarker ? ', nous sommes actuellement dans cette période.' : '.'}
        </span>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(schoolYear.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(schoolYear.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(schoolYear.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
