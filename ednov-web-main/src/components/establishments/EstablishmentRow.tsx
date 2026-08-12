import * as React from 'react';
import { Building2, MapPin, DoorOpen, Users, Clock } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import {
  ESTABLISHMENT_TYPE_CONFIG,
  ESTABLISHMENT_STATUS_CONFIG,
  ESTABLISHMENT_CATEGORY_CONFIG,
  ESTABLISHMENT_PRIORITY_NETWORK_CONFIG,
} from './establishment-configs';
import type { Establishment } from '@/types/establishment.types';

interface EstablishmentRowProps {
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

function computePartnershipSeniority(startDate: Date | string | null | undefined): string {
  if (!startDate) return '—';
  const start = new Date(startDate);
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (totalMonths < 0) return '—';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mois`;
  if (months === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
}

export const EstablishmentRow: React.FC<EstablishmentRowProps> = ({
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
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Building2 className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-medium text-foreground">{establishment.name}</span>
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
        {establishment.establiCategory &&
        ESTABLISHMENT_CATEGORY_CONFIG[establishment.establiCategory] ? (
          <LabelBadge
            label={ESTABLISHMENT_CATEGORY_CONFIG[establishment.establiCategory].label}
            icon={ESTABLISHMENT_CATEGORY_CONFIG[establishment.establiCategory].icon}
            variant="outlined"
            color={ESTABLISHMENT_CATEGORY_CONFIG[establishment.establiCategory].badgeColor}
            size="md"
          />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>

      <td>
        {establishment.priorityNetwork &&
        ESTABLISHMENT_PRIORITY_NETWORK_CONFIG[establishment.priorityNetwork] ? (
          <LabelBadge
            label={ESTABLISHMENT_PRIORITY_NETWORK_CONFIG[establishment.priorityNetwork].label}
            icon={ESTABLISHMENT_PRIORITY_NETWORK_CONFIG[establishment.priorityNetwork].icon}
            variant="outlined"
            color={ESTABLISHMENT_PRIORITY_NETWORK_CONFIG[establishment.priorityNetwork].badgeColor}
            size="md"
          />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>

      <td>
        <span className="text-sm text-foreground">
          {establishment.isQpv === true ? 'Oui' : establishment.isQpv === false ? 'Non' : '—'}
        </span>
      </td>

      <td>
        <span className="text-sm text-foreground">
          {establishment.ipsValue != null ? (
            <span title={establishment.ipsYear ? `Année ${establishment.ipsYear}` : undefined}>
              {establishment.ipsValue}
            </span>
          ) : (
            '—'
          )}
        </span>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-foreground">{establishment.department || 'Non défini'}</span>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">
            {computePartnershipSeniority(establishment.engagementStartDate)}
          </span>
        </div>
      </td>

      <td className="text-center">
        <div className="flex items-center gap-2 justify-center">
          <DoorOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{roomsCount}</span>
        </div>
      </td>

      {showVscCount && (
        <td className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{vscCount}</span>
          </div>
        </td>
      )}

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
          <Button preset="row-view" onClick={() => onView?.(establishment.id)} />
          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(establishment)} />}
          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(establishment.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
