import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { Select } from '@/components/forms/Select';
import { RotateCcw, CheckSquare, Square, Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getRoles } from '@/services/roles.service';
import type { AssignedRecurrence, ScheduleConfig } from '@/types/post-it.types';
import { PostItScheduleConfigForm } from './schedule/PostItScheduleConfigForm';

const RECURRENCE_OPTIONS: { value: AssignedRecurrence; label: string }[] = [
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'annually', label: 'Annuel' },
  { value: 'specific_date', label: 'Date spécifique' },
];

const QUARTERLY_PERIODS: { value: number; label: string }[] = [
  { value: 1, label: 'T1' },
  { value: 2, label: 'T2' },
  { value: 3, label: 'T3' },
  { value: 4, label: 'T4' },
];

export interface SelectionActionConfig {
  roleId: string;
  recurrence: AssignedRecurrence;
  specificDateFrom?: string;
  specificDateTo?: string;
  quarterlyPeriods?: number[];
  // Nouveau système de planification avancée
  scheduleConfig?: ScheduleConfig;
}

interface AssignedSelectionBarProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onApply: (config: SelectionActionConfig) => void;
  onDelete?: () => void;
  onSetPriority?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const AssignedSelectionBar: React.FC<AssignedSelectionBarProps> = ({
  selectedIds,
  totalCount,
  onSelectAll,
  onClearSelection,
  onApply,
  onDelete,
  onSetPriority,
  isLoading = false,
  className,
}) => {
  const [roleId, setRoleId] = React.useState('');
  const [recurrence, setRecurrence] = React.useState<AssignedRecurrence | ''>('');
  const [specificDateFrom, setSpecificDateFrom] = React.useState('');
  const [specificDateTo, setSpecificDateTo] = React.useState('');
  const [quarterlyPeriods, setQuarterlyPeriods] = React.useState<number[]>([]);
  const [scheduleConfig, setScheduleConfig] = React.useState<ScheduleConfig | null>(null);

  const { data: rolesResponse } = useQuery({
    queryKey: ['roles-for-selection-bar'],
    queryFn: () => getRoles({ pageSize: 100 }),
  });

  const roleOptions = React.useMemo(
    () => [
      { value: '', label: 'Choisir un rôle' },
      ...(rolesResponse?.data ?? []).map((r) => ({ value: r.id, label: r.label })),
    ],
    [rolesResponse],
  );

  const hasSelection = selectedIds.length > 0;
  const allSelected = totalCount > 0 && selectedIds.length === totalCount;
  const isApplyEnabled =
    hasSelection &&
    !!roleId &&
    // Soit nouveau système scheduleConfig, soit ancien système recurrence
    (scheduleConfig || (!!recurrence && (recurrence !== 'specific_date' || !!specificDateFrom)));

  const handleToggleAll = () => {
    if (allSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  };

  const handleApply = () => {
    if (!isApplyEnabled) return;
    onApply({
      roleId,
      // Nouveau système
      scheduleConfig: scheduleConfig || undefined,
      // Ancien système (pour rétrocompatibilité)
      recurrence: !scheduleConfig && recurrence ? recurrence : ('weekly' as AssignedRecurrence),
      specificDateFrom:
        !scheduleConfig && recurrence === 'specific_date' ? specificDateFrom : undefined,
      specificDateTo:
        !scheduleConfig && recurrence === 'specific_date' ? specificDateTo : undefined,
      quarterlyPeriods:
        !scheduleConfig && recurrence === 'quarterly' ? quarterlyPeriods : undefined,
    });
    setRoleId('');
    setRecurrence('');
    setSpecificDateFrom('');
    setSpecificDateTo('');
    setQuarterlyPeriods([]);
    setScheduleConfig(null);
  };

  const handleReset = () => {
    onClearSelection();
    setRoleId('');
    setRecurrence('');
    setSpecificDateFrom('');
    setSpecificDateTo('');
    setQuarterlyPeriods([]);
    setScheduleConfig(null);
  };

  return (
    <div className={cn('filters-panel mb-5', className)}>
      {/* ── Header : label + badge + toggle ── */}
      <div className="filter-panel-header">
        <div className="filter-groups-container">
          <div className="filter-group">
            <span className="filter-group-label">Sélection</span>
            <div className="filter-options items-center">
              {/* Bouton "Tout sélectionner" togglable */}
              <Button
                variant="secondary"
                size="sm"
                icon={allSelected ? CheckSquare : Square}
                iconPosition="left"
                onClick={handleToggleAll}
                disabled={totalCount === 0}
                className={cn(allSelected && 'section-action-button-active')}
              >
                Tout sélectionner
              </Button>
            </div>
          </div>

          {/* ── Dropdowns : Assigner un rôle + Récurrence ── */}
          <div className="filter-group">
            <span className="filter-group-label">Appliquer à la sélection</span>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[200px]">
                <Select
                  placeholder="Choisir un rôle"
                  options={roleOptions}
                  value={roleId}
                  onChange={setRoleId}
                  size="sm"
                />
              </div>
              <div className="flex-1">
                <PostItScheduleConfigForm
                  value={scheduleConfig}
                  onChange={(config) => setScheduleConfig(config)}
                  color="blanc-casse"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions groupées (optionnel) ── */}
      {(onDelete || onSetPriority) && selectedIds.length > 0 && (
        <div className="filter-group">
          <span className="filter-group-label">Actions groupées</span>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                iconPosition="left"
                onClick={onDelete}
                loading={isLoading}
                disabled={isLoading}
              >
                Supprimer
              </Button>
            )}
            {onSetPriority && (
              <Button
                variant="secondary"
                size="sm"
                icon={Star}
                iconPosition="left"
                onClick={onSetPriority}
                loading={isLoading}
                disabled={isLoading}
              >
                Marquer comme prioritaire
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Footer : compteur + actions ── */}
      <div className="filter-actions">
        <span className="filter-result-count">
          {selectedIds.length} post-it{selectedIds.length !== 1 ? 's' : ''} sélectionné
          {selectedIds.length !== 1 ? 's' : ''}
        </span>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            iconPosition="left"
            onClick={handleReset}
            disabled={!hasSelection && !roleId && !recurrence && !scheduleConfig}
          >
            Réinitialiser
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={!isApplyEnabled || isLoading}
            loading={isLoading}
          >
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  );
};
