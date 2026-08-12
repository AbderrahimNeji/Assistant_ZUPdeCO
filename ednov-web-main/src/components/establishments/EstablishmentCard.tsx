import * as React from 'react';
import { Building2, MapPin, DoorOpen, Users } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { ESTABLISHMENT_TYPE_CONFIG, ESTABLISHMENT_STATUS_CONFIG } from './establishment-configs';
import type { Establishment } from '@/types/establishment.types';

interface EstablishmentCardProps {
  establishment: Establishment;
  showVscCount?: boolean;
  onView?: (id: string) => void;
  onEdit?: (establishment: Establishment) => void;
  onDelete?: (id: string) => void;
  pageActions?: {
    canEditRow?: boolean;
    canDeleteRow?: boolean;
  };
}

export const EstablishmentCard: React.FC<EstablishmentCardProps> = ({
  establishment,
  showVscCount = false,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const typeConfig =
    ESTABLISHMENT_TYPE_CONFIG[establishment.type as string] || ESTABLISHMENT_TYPE_CONFIG.college;
  const statusConfig =
    ESTABLISHMENT_STATUS_CONFIG[establishment.status] || ESTABLISHMENT_STATUS_CONFIG.active;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  const roomsCount = establishment.roomsCount ?? 0;
  const vscCount = establishment.vscCount ?? 0;

  return (
    <TableCard onClick={() => onView?.(establishment.id)}>
      <div className="data-card-header">
        <LabelBadge
          label={typeConfig.label}
          icon={TypeIcon}
          variant="ghost"
          color={typeConfig.badgeColor}
          size="sm"
        />
      </div>

      <div className="data-card-content">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]">
            <Building2 className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-foreground text-base truncate">
              {establishment.name}
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-0.5">
              <LabelBadge
                label={statusConfig.label}
                icon={StatusIcon}
                variant={statusConfig.badgeVariant}
                color={statusConfig.badgeColor}
                size="sm"
              />
            </div>
          </div>
        </div>

        {establishment.department && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin
              className="w-4 h-4 flex-shrink-0"
              style={{ color: 'var(--color-1-nuance-1)' }}
            />
            <span className="text-sm text-foreground truncate">{establishment.department}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {roomsCount} {roomsCount === 1 ? 'salle' : 'salles'}
          </span>
        </div>

        {showVscCount && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{vscCount} VSC</span>
          </div>
        )}
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(establishment.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(establishment);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(establishment.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
