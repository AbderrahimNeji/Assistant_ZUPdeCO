import * as React from 'react';
import { Layers, Calendar, Info } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { LEVEL_STATUS_CONFIG, LEVEL_CYCLE_CONFIG } from '@/components/levels/level-configs';
import type { Level } from '@/types/level.types';

export const renderLevelContent = (level: Level): React.ReactNode => {
  const statusConfig = LEVEL_STATUS_CONFIG[level.status] || LEVEL_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const cycleConfig = level.educationCycle ? LEVEL_CYCLE_CONFIG[level.educationCycle] : null;
  const CycleIcon = cycleConfig?.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  const cycleColorName = cycleConfig?.colorName ?? 'color-2';

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <Layers className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{level.label}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(level.status)}
                variant="filled"
              />
              {cycleConfig && CycleIcon && (
                <DetailBadge
                  label={cycleConfig.label}
                  icon={CycleIcon}
                  colorName={cycleColorName}
                  variant="outlined"
                />
              )}
            </div>
            <p className="details-view-header-subtitle">{level.code}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={2}>
          <div className="space-y-3">
            <DetailField label="Code" value={level.code} />
            <DetailField label="Libellé" value={level.label} />
          </div>
        </SectionCard>

        {level.createdAt && (
          <SectionCard icon={Calendar} title="Informations système" colorName="color-1" colSpan={1}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(level.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {level.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(level.updatedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
};
