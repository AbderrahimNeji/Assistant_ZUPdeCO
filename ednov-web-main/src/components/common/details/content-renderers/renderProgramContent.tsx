import * as React from 'react';
import { FileText, Calendar, Info, Minus } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { PROGRAM_STATUS_CONFIG } from '@/components/programs/program-configs';
import type { Program } from '@/types/program.types';

export const renderProgramContent = (program: Program): React.ReactNode => {
  const statusConfig = PROGRAM_STATUS_CONFIG[program.status] || PROGRAM_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <FileText className="w-7 h-7 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{program.name}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(program.status)}
                variant="filled"
              />
            </div>
            <p className="details-view-header-subtitle">{program.code}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={1}>
          <div className="space-y-3">
            <DetailField label="Code" value={program.code} />
            <DetailField label="Nom" value={program.name} />
            {program.description && (
              <DetailField label="Description" value={program.description} vertical />
            )}
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Dates" colorName="color-1" colSpan={1}>
          <div className="space-y-3">
            {program.startDate ? (
              <DetailField
                label="Date de début"
                value={new Date(program.startDate).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            ) : (
              <EmptyPlaceholder message="Aucune date de début" />
            )}
            {program.endDate ? (
              <DetailField
                label="Date de fin"
                value={new Date(program.endDate).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            ) : (
              <EmptyPlaceholder message="Aucune date de fin" />
            )}
          </div>
        </SectionCard>
      </div>

      {program.createdAt && (
        <div className="mt-8 pt-4 border-t border-[var(--color-1-nuance-3)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(program.createdAt).toLocaleDateString('fr-FR')}</span>
            {program.updatedAt && (
              <>
                <Minus className="w-3 h-3" />
                <span>Modifié le {new Date(program.updatedAt).toLocaleDateString('fr-FR')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
