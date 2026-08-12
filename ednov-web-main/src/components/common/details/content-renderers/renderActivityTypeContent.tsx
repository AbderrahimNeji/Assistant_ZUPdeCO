import * as React from 'react';
import { Tag, Calendar, Info } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { ACTIVITY_TYPE_STATUS_CONFIG } from '@/components/activity-types/activity-type-configs';
import type { ActivityType } from '@/types/activity.types';

export const renderActivityTypeContent = (activityType: ActivityType): React.ReactNode => {
  const statusConfig =
    ACTIVITY_TYPE_STATUS_CONFIG[activityType.status] || ACTIVITY_TYPE_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <Tag className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{activityType.label}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(activityType.status)}
                variant="filled"
              />
            </div>
            <p className="details-view-header-subtitle">{activityType.code}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={2}>
          <div className="space-y-3">
            <DetailField label="Code" value={activityType.code} />
            <DetailField label="Libellé" value={activityType.label} />
            {activityType.description && (
              <DetailField label="Description" value={activityType.description} vertical />
            )}
          </div>
        </SectionCard>

        {activityType.createdAt && (
          <SectionCard icon={Calendar} title="Informations système" colorName="color-1" colSpan={1}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(activityType.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {activityType.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(activityType.updatedAt).toLocaleDateString('fr-FR', {
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
