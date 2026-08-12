import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Calendar, Building2, UserCheck, Star, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { Button } from '@/components/forms/Button';
import { ValidateModal } from '@/components/modals/ValidateModal';
import { usePageActions } from '@/hooks/usePageActions';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  updateVscDailyReport,
  validateVscDailyReport,
  formatVscDailyDateTime,
  isVscDailyReportVisibleNow,
} from '@/services/vsc-daily-reports.service';
import { VSC_DAILY_REPORT_STATUS_CONFIG } from '@/components/vsc-reports/vsc-daily-report-configs';
import type { VscDailyReport } from '@/types/vsc-daily-report.types';

const formatYmd = (ymd: string): string => {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`);
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
};

/** Contenu détail pour un rapport journalier (même langage visuel que renderVscReportContent). */
export const VscDailyReportDetailsPanel: React.FC<{
  report: VscDailyReport;
  /** `view` : consultation seule (pas de saisie ni validation depuis ce panneau). */
  presentationMode?: 'view' | 'edit';
  /** Masquer l’en-tête type panneau détail (vue pleine formulaire). */
  hideDetailHeader?: boolean;
}> = ({ report, presentationMode = 'edit', hideDetailHeader = false }) => {
  const queryClient = useQueryClient();
  const { canValidate } = usePageActions('vsc-reports');
  const { user, isVolunteer, isVsc, isManager, isCoordinator } = useConnectedUser();
  const [draft, setDraft] = React.useState<{ rating: number | null; comment: string }>({
    rating: report.rating,
    comment: report.comment ?? '',
  });
  const [validateOpen, setValidateOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft({ rating: report.rating, comment: report.comment ?? '' });
  }, [report.id, report.rating, report.comment]);

  const updateMutation = useMutation({
    mutationFn: (dto: Parameters<typeof updateVscDailyReport>[1]) =>
      updateVscDailyReport(report.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
      toast.success('Rapport enregistré');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Erreur lors de l’enregistrement';
      toast.error(msg);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validateVscDailyReport(report.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
      toast.success('Rapport validé');
      setValidateOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la validation';
      toast.error(msg);
    },
  });

  const statusCfg = VSC_DAILY_REPORT_STATUS_CONFIG[report.status];
  const StatusIcon = statusCfg.icon;
  const vscName =
    report.vscUser?.displayName?.trim() ||
    [report.vscUser?.firstName, report.vscUser?.lastName].filter(Boolean).join(' ').trim() ||
    report.vscUser?.email ||
    'VSC inconnu';

  const isAssignedVsc =
    !!user?.id && (user.id === report.vscUserId || user.id === report.vscUser?.id);
  const isVscAccount = isVolunteer || isVsc;
  const visible = isVscDailyReportVisibleNow(report);
  const editable =
    presentationMode !== 'view' &&
    isAssignedVsc &&
    isVscAccount &&
    visible &&
    report.status !== 'validated';
  const formDisabled = !editable;
  const canSubmit = editable && draft.rating != null && report.status === 'to_fill';
  const dirty = draft.rating !== report.rating || (draft.comment || '') !== (report.comment ?? '');
  const canValidateDailyUi =
    presentationMode !== 'view' &&
    canValidate &&
    (isManager || isCoordinator) &&
    report.status === 'submitted';

  return (
    <>
      {!hideDetailHeader ? (
        <div className="details-view-header">
          <div className="details-view-header-left">
            <div className="details-view-header-icon">
              <FileText className="w-7 h-7 text-[var(--color-2-nuance-1)]" />
            </div>
            <div className="details-view-header-content">
              <div className="details-view-header-with-badges">
                <h3 className="text-2xl font-bold text-[var(--color-1-nuance-1)] capitalize">
                  Rapport VSC journalier
                </h3>
                <DetailBadge
                  label={statusCfg.label}
                  icon={StatusIcon}
                  colorName={report.status === 'validated' ? 'success' : 'error'}
                  variant="filled"
                />
              </div>
              <p className="text-base text-[var(--color-1-nuance-2)]">
                {report.establishment?.name ?? 'Établissement'} · {formatYmd(report.reportDate)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="details-view-grid">
        <SectionCard icon={Calendar} title="Séance de référence" colorName="color-2" colSpan={1}>
          <div className="space-y-2">
            <DetailField label="Date du rapport" value={formatYmd(report.reportDate)} />
            {report.unlockSession?.startTime && (
              <DetailField
                label="Horaire"
                value={`${report.unlockSession.startTime.slice(0, 5)}${
                  report.unlockSession.endTime
                    ? ` – ${report.unlockSession.endTime.slice(0, 5)}`
                    : ''
                }`}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard icon={Building2} title="Établissement" colorName="color-1" colSpan={1}>
          <DetailField label="Nom" value={report.establishment?.name ?? '—'} vertical />
        </SectionCard>

        <SectionCard icon={UserCheck} title="VSC" colorName="color-3" colSpan={1}>
          <DetailField label="Volontaire" value={vscName} vertical />
        </SectionCard>

        {report.status === 'validated' && report.validatedAt && (
          <SectionCard icon={CheckCircle2} title="Validation" colorName="color-3" colSpan="full">
            <DetailField label="Validé le" value={formatVscDailyDateTime(report.validatedAt)} />
          </SectionCard>
        )}

        <SectionCard icon={Star} title="Appréciation" colorName="color-2" colSpan="full">
          <div className={cn('space-y-4', formDisabled && 'opacity-60')}>
            <span className="text-xs font-medium text-muted-foreground">Note (1 à 5)</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={formDisabled}
                  onClick={() => setDraft((p) => ({ ...p, rating: n }))}
                  className={cn(
                    'rounded-lg p-1 transition-colors',
                    !formDisabled && 'hover:bg-[var(--color-hover)]',
                    draft.rating != null && n <= draft.rating
                      ? 'text-amber-500'
                      : 'text-muted-foreground',
                  )}
                  aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                >
                  <Star className={cn('h-7 w-7', n <= (draft.rating ?? 0) && 'fill-current')} />
                </button>
              ))}
            </div>

            <div>
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                Commentaire
              </span>
              <textarea
                disabled={formDisabled}
                value={draft.comment}
                onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-[color-mix(in_srgb,var(--color-1-nuance-3)_35%,transparent)] bg-[var(--card)] px-3 py-2 text-sm"
                placeholder="Votre retour sur la journée…"
              />
            </div>

            {presentationMode !== 'view' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  preset="form-save"
                  disabled={formDisabled || updateMutation.isPending || !dirty}
                  onClick={() =>
                    updateMutation.mutate({
                      rating: draft.rating,
                      comment: draft.comment || null,
                    })
                  }
                >
                  Enregistrer
                </Button>
                <Button
                  preset="modal-confirm"
                  disabled={!canSubmit || updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      rating: draft.rating,
                      comment: draft.comment || null,
                      status: 'submitted',
                    })
                  }
                >
                  Soumettre
                </Button>
                {canValidateDailyUi && (
                  <Button preset="row-validate" onClick={() => setValidateOpen(true)}>
                    Valider
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <ValidateModal
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
        onConfirm={() => void validateMutation.mutateAsync()}
        itemName="ce rapport journalier"
        isLoading={validateMutation.isPending}
        description="Confirmer la validation ? Seuls les rôles autorisés côté serveur peuvent valider."
      />
    </>
  );
};

export const renderVscDailyReportContent = (report: VscDailyReport): React.ReactNode => (
  <VscDailyReportDetailsPanel report={report} presentationMode="edit" />
);
