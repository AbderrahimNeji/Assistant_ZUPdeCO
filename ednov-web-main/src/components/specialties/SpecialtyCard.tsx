import * as React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { SPECIALTY_STATUS_CONFIG } from './specialty-configs';
import type { Specialty } from '@/services/specialties.service';

interface SpecialtyCardProps {
  specialty: Specialty;
  onEdit?: (id: string) => void;
  onDelete?: (specialty: Specialty) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

export const SpecialtyCard: React.FC<SpecialtyCardProps> = ({
  specialty,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canToggle = pageActions?.canDeleteRow ?? true;

  const statusKey = specialty.isActive ? 'active' : 'inactive';
  const statusConfig = SPECIALTY_STATUS_CONFIG[statusKey];
  const StatusIcon = statusConfig.icon;

  return (
    <TableCard>
      <div className="data-card-header">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <Star className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <span className="font-mono text-sm text-muted-foreground">{specialty.code}</span>
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
        <h3 className="font-semibold text-foreground text-base mb-1">{specialty.label}</h3>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(specialty.id);
              }}
            />
          )}
          {canToggle && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(specialty);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
