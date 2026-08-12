import * as React from 'react';
import { Calendar as CalendarIcon, Calendar, Info, Star } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { SCHOOL_YEAR_STATUS_CONFIG } from '@/components/school-years/school-year-configs';
import type { SchoolYear } from '@/types/school-year.types';

export const renderSchoolYearContent = (schoolYear: SchoolYear): React.ReactNode => {
  const statusConfig =
    SCHOOL_YEAR_STATUS_CONFIG[schoolYear.status] || SCHOOL_YEAR_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <CalendarIcon className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{schoolYear.code}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(schoolYear.status)}
                variant="filled"
              />
              {schoolYear.isCurrent && (
                <DetailBadge
                  label="Année en cours"
                  icon={Star}
                  colorName="color-2"
                  variant="filled"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={1}>
          <div className="space-y-3">
            <DetailField label="Code" value={schoolYear.code} />
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Période" colorName="color-1" colSpan={1}>
          <div className="space-y-3">
            <DetailField
              label="Date de début"
              value={new Date(schoolYear.startDate).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              vertical
            />
            <DetailField
              label="Date de fin"
              value={new Date(schoolYear.endDate).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              vertical
            />
          </div>
        </SectionCard>

        {schoolYear.createdAt && (
          <SectionCard icon={Calendar} title="Informations système" colorName="color-3" colSpan={1}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(schoolYear.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {schoolYear.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(schoolYear.updatedAt).toLocaleDateString('fr-FR', {
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
