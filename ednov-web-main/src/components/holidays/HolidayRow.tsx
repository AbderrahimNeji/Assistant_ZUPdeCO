import * as React from 'react';
import { Eye, Edit, Trash2, RefreshCw, Building2, Calendar, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { HOLIDAY_TYPE_CONFIG, formatHolidayOptionsText } from './holiday-configs';
import type { Holiday } from '@/types/holiday.types';

interface HolidayRowProps {
  holiday: Holiday;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const HolidayRow: React.FC<HolidayRowProps> = ({
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
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{holiday.name}</span>
        </div>
      </td>

      <td>
        <LabelBadge
          label={typeConfig.label}
          icon={TypeIcon}
          variant={typeConfig.badgeVariant}
          color={typeConfig.badgeColor}
          size="md"
        />
      </td>

      <td>
        {holiday.vacationZone?.code ? (
          <span className="text-sm font-medium text-foreground">
            Zone {holiday.vacationZone.code}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>

      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="text-sm text-foreground">{formatDate(holiday.startDate)}</span>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]">
            <Calendar className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
          </div>
          <span className="text-sm text-foreground">{formatDate(holiday.endDate)}</span>
        </div>
      </td>

      <td title={formatHolidayOptionsText(holiday)}>
        <div className="flex flex-wrap gap-1">
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
        </div>
      </td>

      <td>
        {holiday.description && (
          <span className="text-sm text-muted-foreground line-clamp-1">{holiday.description}</span>
        )}
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(holiday.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(holiday.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(holiday.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
