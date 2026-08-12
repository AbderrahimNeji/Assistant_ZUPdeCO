import * as React from 'react';
import {
  FileText,
  Calendar,
  User,
  UserCheck,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  Building2,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  FileCheck,
  FileClock,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { VSC_REPORT_STATUS_CONFIG } from '@/components/vsc-reports/vsc-report-configs';
import type { VscReport } from '@/types/vsc-report.types';

export const renderVscReportContent = (vscReport: VscReport): React.ReactNode => {
  const statusConfig = VSC_REPORT_STATUS_CONFIG[vscReport.status] || VSC_REPORT_STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'validated' ? 'success' : 'error';
  };

  const isAutomatedReport = !!vscReport.category;

  const dayName = vscReport.session
    ? format(new Date(vscReport.session.sessionDate), 'EEEE', { locale: fr })
    : '';

  const dateFormatted = vscReport.session
    ? format(new Date(vscReport.session.sessionDate), 'd MMMM yyyy', { locale: fr })
    : '';

  const categoryLabel =
    vscReport.category === 'daily'
      ? 'Journalier'
      : vscReport.category === 'weekly'
        ? 'Hebdomadaire'
        : null;

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <FileText className="w-7 h-7 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="text-2xl font-bold text-[var(--color-1-nuance-1)] capitalize">
                Rapport VSC{' '}
                {isAutomatedReport
                  ? `- ${categoryLabel}`
                  : vscReport.session
                    ? `- ${dayName} ${dateFormatted}`
                    : ''}
              </h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(vscReport.status)}
                variant="filled"
              />
              {categoryLabel && (
                <DetailBadge
                  label={categoryLabel}
                  icon={BarChart3}
                  colorName="color-2"
                  variant="outlined"
                />
              )}
              {vscReport.student && (
                <DetailBadge
                  label="Élève suivi"
                  icon={User}
                  colorName="color-1"
                  variant="outlined"
                />
              )}
              {vscReport.volunteer && (
                <DetailBadge
                  label="VSC assigné"
                  icon={UserCheck}
                  colorName="color-3"
                  variant="outlined"
                />
              )}
            </div>
            {vscReport.student && (
              <p className="text-base text-[var(--color-1-nuance-2)]">
                {vscReport.student.displayName || 'Élève'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        {isAutomatedReport && vscReport.periodStart && vscReport.periodEnd && (
          <SectionCard icon={Calendar} title="Période" colorName="color-2" colSpan={1}>
            <div className="space-y-2">
              <DetailField
                label="Du"
                value={format(new Date(vscReport.periodStart), 'd MMMM yyyy', { locale: fr })}
              />
              <DetailField
                label="Au"
                value={format(new Date(vscReport.periodEnd), 'd MMMM yyyy', { locale: fr })}
              />
              {vscReport.establishment && (
                <DetailField
                  icon={Building2}
                  label="Établissement"
                  value={vscReport.establishment.name}
                />
              )}
            </div>
          </SectionCard>
        )}

        {!isAutomatedReport && vscReport.session && (
          <SectionCard icon={Calendar} title="Séance" colorName="color-2" colSpan={1}>
            <div className="space-y-2">
              <DetailField
                label="Date"
                value={format(new Date(vscReport.session.sessionDate), 'EEEE d MMMM yyyy', {
                  locale: fr,
                })}
              />
              {vscReport.session.establishment?.name && (
                <DetailField
                  icon={Building2}
                  label="Établissement"
                  value={vscReport.session.establishment.name}
                />
              )}
            </div>
          </SectionCard>
        )}

        {/* Section VSC Responsable */}
        {vscReport.vsc && (
          <SectionCard icon={UserCheck} title="VSC Responsable" colorName="color-3" colSpan={1}>
            <DetailField
              label="VSC"
              value={
                vscReport.vsc.displayName ||
                `${vscReport.vsc.firstName || ''} ${vscReport.vsc.lastName || ''}`.trim() ||
                'N/R'
              }
              vertical
            />
          </SectionCard>
        )}

        {!isAutomatedReport && (
          <SectionCard icon={User} title="Participants" colorName="color-1" colSpan={2}>
            <div className="space-y-3">
              {vscReport.student && (
                <DetailField
                  label="Élève"
                  value={vscReport.student.displayName || 'N/R'}
                  vertical
                />
              )}
              {vscReport.volunteer && (
                <DetailField
                  label="VSC"
                  value={
                    vscReport.volunteer.displayName ||
                    `${vscReport.volunteer.firstName || ''} ${vscReport.volunteer.lastName || ''}`.trim() ||
                    'N/R'
                  }
                  vertical
                />
              )}
            </div>
          </SectionCard>
        )}

        {isAutomatedReport && (
          <SectionCard icon={BarChart3} title="Métriques" colorName="color-1" colSpan={2}>
            <div className="grid grid-cols-2 gap-3">
              <DetailField
                icon={CheckCircle}
                label="Séances terminées"
                value={vscReport.sessionsCompleted?.toString() || '0'}
              />
              <DetailField
                icon={XCircle}
                label="Séances annulées"
                value={vscReport.sessionsCancelled?.toString() || '0'}
              />
              <DetailField
                icon={FileCheck}
                label="CR soumis"
                value={vscReport.reportsSubmitted?.toString() || '0'}
              />
              <DetailField
                icon={FileClock}
                label="CR en attente"
                value={vscReport.reportsPending?.toString() || '0'}
              />
              <DetailField
                icon={CheckCircle}
                label="CR validés"
                value={vscReport.reportsValidated?.toString() || '0'}
              />
              <DetailField
                icon={Clock}
                label="Heures tuteur"
                value={`${typeof vscReport.tutorHours === 'string' ? parseFloat(vscReport.tutorHours).toFixed(2) : vscReport.tutorHours?.toFixed(2) || '0.00'}h`}
              />
            </div>
          </SectionCard>
        )}

        {!isAutomatedReport && (
          <>
            <SectionCard icon={MessageSquare} title="Résumé" colorName="color-3" colSpan="full">
              {vscReport.summary ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{vscReport.summary}</p>
              ) : (
                <EmptyPlaceholder message="Aucun résumé renseigné" />
              )}
            </SectionCard>

            <SectionCard
              icon={TrendingUp}
              title="Évaluation des progrès"
              colorName="color-2"
              colSpan="full"
            >
              {vscReport.progressEvaluation ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {vscReport.progressEvaluation}
                </p>
              ) : (
                <EmptyPlaceholder message="Aucune évaluation des progrès" />
              )}
            </SectionCard>

            <SectionCard
              icon={Lightbulb}
              title="Recommandations"
              colorName="color-1"
              colSpan="full"
            >
              {vscReport.recommendations ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {vscReport.recommendations}
                </p>
              ) : (
                <EmptyPlaceholder message="Aucune recommandation" />
              )}
            </SectionCard>
          </>
        )}

        {vscReport.createdAt && (
          <SectionCard icon={Calendar} title="Métadonnées" colorName="color-3" colSpan="full">
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={format(new Date(vscReport.createdAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
              />
              {vscReport.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={format(new Date(vscReport.updatedAt), 'd MMMM yyyy à HH:mm', {
                    locale: fr,
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
