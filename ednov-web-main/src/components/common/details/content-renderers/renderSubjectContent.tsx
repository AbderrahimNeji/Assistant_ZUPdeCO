import * as React from 'react';
import { BookOpen, Calendar, Info, Star } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { SUBJECT_STATUS_CONFIG, SUBJECT_CYCLE_CONFIG } from '@/components/subjects/subject-configs';
import type { Subject } from '@/types/subject.types';

export const renderSubjectContent = (subject: Subject): React.ReactNode => {
  const statusConfig = SUBJECT_STATUS_CONFIG[subject.status] || SUBJECT_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const cycleConfig = subject.educationCycle ? SUBJECT_CYCLE_CONFIG[subject.educationCycle] : null;
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
            <BookOpen className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{subject.label}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(subject.status)}
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
              {subject.isCore && (
                <DetailBadge
                  label="Matière principale"
                  icon={Star}
                  colorName="color-1"
                  variant="outlined"
                />
              )}
            </div>
            <p className="details-view-header-subtitle">{subject.code}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={2}>
          <div className="space-y-3">
            <DetailField label="Code" value={subject.code} />
            <DetailField label="Libellé" value={subject.label} />
            {subject.description && (
              <DetailField label="Description" value={subject.description} vertical />
            )}
          </div>
        </SectionCard>

        {subject.createdAt && (
          <SectionCard icon={Calendar} title="Informations système" colorName="color-1" colSpan={1}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(subject.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {subject.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(subject.updatedAt).toLocaleDateString('fr-FR', {
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
