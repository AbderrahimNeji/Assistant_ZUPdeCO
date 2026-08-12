import * as React from 'react';
import { Palmtree, Calendar, Info, XCircle } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { HOLIDAY_TYPE_CONFIG } from '@/components/holidays/holiday-configs';
import type { Holiday } from '@/types/holiday.types';

export const renderHolidayContent = (holiday: Holiday): React.ReactNode => {
  const typeConfig = HOLIDAY_TYPE_CONFIG[holiday.type];
  const TypeIcon = typeConfig.icon;

  const typeColorName = typeConfig.colorName ?? 'color-2';

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <Palmtree className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{holiday.name}</h3>
              <DetailBadge
                label={typeConfig.label}
                icon={TypeIcon}
                colorName={typeColorName}
                variant="filled"
              />
              {holiday.isRecurringYearly ? (
                <DetailBadge
                  label="Récurrent"
                  icon={Calendar}
                  colorName="color-1"
                  variant="outlined"
                />
              ) : (
                <DetailBadge
                  label="Non récurrent"
                  icon={XCircle}
                  colorName="color-1"
                  variant="outlined"
                />
              )}
            </div>
            <p className="details-view-header-subtitle">{typeConfig.label}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={1}>
          <div className="space-y-3">
            <DetailField label="Nom" value={holiday.name} />
            {holiday.vacationZone && (
              <DetailField
                label="Zone vacances scolaires"
                value={`${holiday.vacationZone.name} (${holiday.vacationZone.code})`}
              />
            )}
            {holiday.description && (
              <DetailField label="Description" value={holiday.description} vertical />
            )}
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Période" colorName="color-1" colSpan={1}>
          <div className="grid grid-cols-2 gap-4">
            <DetailField
              label="Date de début"
              value={new Date(holiday.startDate).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              vertical
            />
            <DetailField
              label="Date de fin"
              value={new Date(holiday.endDate).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              vertical
            />
          </div>
        </SectionCard>

        {holiday.createdAt && (
          <SectionCard icon={Calendar} title="Informations système" colorName="color-3" colSpan={1}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(holiday.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {holiday.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(holiday.updatedAt).toLocaleDateString('fr-FR', {
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
