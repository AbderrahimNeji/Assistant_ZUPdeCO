import * as React from 'react';
import { Calendar, RefreshCw, Building2, XCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { HOLIDAY_TYPE_CONFIG, formatHolidayOptionsText } from './holiday-configs';
import type { Holiday } from '@/types/holiday.types';

interface HolidayCardProps {
  holiday: Holiday;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const HolidayCard: React.FC<HolidayCardProps> = ({
  holiday,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const typeConfig = HOLIDAY_TYPE_CONFIG[holiday.type];
  const TypeIcon = typeConfig.icon;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <TableCard onClick={() => onView?.(holiday.id)}>
      <div className="data-card-header">
        <LabelBadge
          label={typeConfig.label}
          icon={TypeIcon}
          variant={typeConfig.badgeVariant}
          color={typeConfig.badgeColor}
          size="sm"
        />
      </div>

      <div className="data-card-content">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground text-sm">{holiday.name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>
                {formatDate(holiday.startDate)} - {formatDate(holiday.endDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
          {holiday.isRecurringYearly ? (
            <LabelBadge
              label="Récurrent"
              icon={RefreshCw}
              variant="outlined"
              color="var(--color-2-nuance-1)"
              size="sm"
            />
          ) : (
            <LabelBadge
              label="Non récurrent"
              icon={XCircle}
              variant="outlined"
              color="var(--color-1-nuance-1)"
              size="sm"
            />
          )}

          {(holiday.establishmentName || holiday.establishmentId) && (
            <LabelBadge
              label={holiday.establishmentName || 'Établissement'}
              icon={Building2}
              variant="outlined"
              color="var(--color-1-nuance-1)"
              size="sm"
            />
          )}

          {holiday.vacationZone?.code && (
            <LabelBadge
              label={`Zone ${holiday.vacationZone.code}`}
              icon={MapPin}
              variant="outlined"
              color="var(--color-1-nuance-1)"
              size="sm"
            />
          )}
        </div>

        <p
          className="text-xs text-muted-foreground mt-2 line-clamp-2"
          title={formatHolidayOptionsText(holiday)}
        >
          <span className="font-medium text-foreground/80">Options :</span>{' '}
          {formatHolidayOptionsText(holiday)}
        </p>

        {holiday.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-3">{holiday.description}</p>
        )}
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(holiday.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(holiday.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(holiday.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
