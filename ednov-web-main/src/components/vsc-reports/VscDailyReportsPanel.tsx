import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, CalendarDays, Lock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';
import { ValidateModal } from '@/components/modals/ValidateModal';
import { usePageActions } from '@/hooks/usePageActions';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { VscDailyReport } from '@/types/vsc-daily-report.types';
import {
  getAllVscDailyReports,
  updateVscDailyReport,
  validateVscDailyReport,
  isVscDailyReportVisibleNow,
  formatVscDailyDate,
  formatVscDailyDateTime,
} from '@/services/vsc-daily-reports.service';

const STATUS_LABELS: Record<VscDailyReport['status'], string> = {
  to_fill: 'À saisir',
  submitted: 'Soumis',
  validated: 'Validé',
};

const PAGE_SIZE = 10;

export const VscDailyReportsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const reportDateFilter = searchParams.get('reportDate')?.slice(0, 10) ?? undefined;
  const establishmentIdFilter = searchParams.get('establishmentId') ?? undefined;
  const highlightReportId = searchParams.get('dailyReport');
  const { canValidate } = usePageActions('vsc-reports');
  const { user, isVolunteer, isVsc, isManager, isCoordinator } = useConnectedUser();
  const canValidateDailyUi = canValidate && (isManager || isCoordinator);
  const [page, setPage] = React.useState(1);
  const [validateId, setValidateId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<
    Record<string, { rating: number | null; comment: string }>
  >({});
  const rowRefs = React.useRef<Partial<Record<string, HTMLLIElement | null>>>({});

  React.useEffect(() => {
    setPage(1);
  }, [reportDateFilter, establishmentIdFilter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['vsc-daily-reports', page, reportDateFilter, establishmentIdFilter],
    queryFn: () =>
      getAllVscDailyReports({
        page,
        pageSize: PAGE_SIZE,
        includeNotYetVisible: true,
        ...(reportDateFilter ? { reportDate: reportDateFilter } : {}),
        ...(establishmentIdFilter ? { establishmentId: establishmentIdFilter } : {}),
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof updateVscDailyReport>[1] }) =>
      updateVscDailyReport(id, dto),
    onSuccess: (_saved, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
      setDrafts((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      toast.success('Rapport enregistré');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Erreur lors de l’enregistrement';
      toast.error(msg);
    },
  });

  const validateMutation = useMutation({
    mutationFn: validateVscDailyReport,
    onSuccess: (_saved, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['vsc-daily-reports'] });
      if (typeof reportId === 'string') {
        setDrafts((p) => {
          const next = { ...p };
          delete next[reportId];
          return next;
        });
      }
      toast.success('Rapport validé');
      setValidateId(null);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la validation';
      toast.error(msg);
    },
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  React.useEffect(() => {
    if (!data?.data?.length) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const r of data.data) {
        if (next[r.id] === undefined) {
          next[r.id] = { rating: r.rating, comment: r.comment ?? '' };
        }
      }
      return next;
    });
  }, [data?.data]);

  React.useEffect(() => {
    if (!highlightReportId || isLoading) return;
    const el = rowRefs.current[highlightReportId];
    if (el) {
      const t = window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return () => window.cancelAnimationFrame(t);
    }
    return undefined;
  }, [highlightReportId, isLoading, items]);

  return (
    <div className="vsc-daily-reports-panel space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Rapports générés chaque soir pour le lendemain lorsqu’il y a au moins une séance prévue. Ils
        deviennent modifiables à partir de l’heure indiquée (fin de la première séance du jour).
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-text-muted)]">
          Aucun rapport journalier pour le moment.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => {
            const visible = isVscDailyReportVisibleNow(r);
            const draft = drafts[r.id] ?? { rating: r.rating, comment: r.comment ?? '' };
            const isAssignedVsc =
              !!user?.id && (user.id === r.vscUserId || user.id === r.vscUser?.id);
            const isVscAccount = isVolunteer || isVsc;
            const editable = isAssignedVsc && isVscAccount && visible && r.status !== 'validated';
            const canSubmit = editable && draft.rating != null && r.status === 'to_fill';

            return (
              <li
                key={r.id}
                ref={(el) => {
                  rowRefs.current[r.id] = el;
                }}
                className={cn(
                  'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm',
                  highlightReportId === r.id &&
                    'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <CalendarDays className="h-4 w-4 text-[var(--color-text-muted)]" />
                      <span>{formatVscDailyDate(r.reportDate)}</span>
                      <span className="text-[var(--color-text-muted)]">·</span>
                      <span>{r.establishment?.name ?? 'Établissement'}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Statut :{' '}
                      <span className="font-medium text-[var(--color-text)]">
                        {STATUS_LABELS[r.status]}
                      </span>
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                      visible
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
                    )}
                  >
                    {visible ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Saisie ouverte
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Dès le {formatVscDailyDateTime(r.visibleAt)}
                      </>
                    )}
                  </div>
                </div>

                {r.status === 'validated' && r.validatedAt && (
                  <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                    Validé le {formatVscDailyDateTime(r.validatedAt)}
                  </p>
                )}

                <div className={cn('mt-4 space-y-3', !editable && 'opacity-60')}>
                  <div>
                    <span className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
                      Appréciation (1 à 5)
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={!editable}
                          onClick={() =>
                            setDrafts((p) => ({
                              ...p,
                              [r.id]: { ...draft, rating: n },
                            }))
                          }
                          className={cn(
                            'rounded p-1 transition-colors',
                            editable && 'hover:bg-[var(--color-hover)]',
                            draft.rating != null && n <= draft.rating
                              ? 'text-amber-500'
                              : 'text-[var(--color-text-muted)]',
                          )}
                          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={cn('h-6 w-6', n <= (draft.rating ?? 0) && 'fill-current')}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
                      Commentaire
                    </label>
                    <textarea
                      disabled={!editable}
                      value={draft.comment}
                      onChange={(e) =>
                        setDrafts((p) => ({
                          ...p,
                          [r.id]: { ...draft, comment: e.target.value },
                        }))
                      }
                      rows={4}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                      placeholder={
                        visible
                          ? 'Votre retour sur la journée…'
                          : 'Disponible après la première séance terminée'
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      preset="form-save"
                      disabled={
                        !editable ||
                        updateMutation.isPending ||
                        (draft.rating === r.rating && (draft.comment || '') === (r.comment ?? ''))
                      }
                      onClick={() =>
                        updateMutation.mutate({
                          id: r.id,
                          dto: { rating: draft.rating, comment: draft.comment || null },
                        })
                      }
                    >
                      Enregistrer le brouillon
                    </Button>
                    <Button
                      preset="modal-confirm"
                      disabled={!canSubmit || updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          id: r.id,
                          dto: {
                            rating: draft.rating,
                            comment: draft.comment || null,
                            status: 'submitted',
                          },
                        })
                      }
                    >
                      Soumettre
                    </Button>
                    {canValidateDailyUi && r.status === 'submitted' && (
                      <Button preset="row-validate" onClick={() => setValidateId(r.id)}>
                        Valider
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            preset="pagination-prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page} / {totalPages}
          </span>
          <Button
            preset="pagination-next"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ValidateModal
        open={validateId !== null}
        onClose={() => setValidateId(null)}
        onConfirm={async () => {
          if (validateId) await validateMutation.mutateAsync(validateId);
        }}
        itemName="ce rapport journalier VSC"
        isLoading={validateMutation.isPending}
        description="Confirmer la validation de ce rapport journalier ? Le statut passera à Validé."
      />
    </div>
  );
};
