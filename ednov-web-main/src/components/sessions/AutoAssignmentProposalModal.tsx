import * as React from 'react';
import { Sparkles, AlertTriangle, Heart, Scale, UserCircle2 } from 'lucide-react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import type { AutoAssignmentProposal } from '@/types/matching.types';
import type { UserWithProfile } from '@/types/user.types';

interface AutoAssignmentProposalModalProps {
  open: boolean;
  onClose: () => void;
  /** Appliquer la suggestion : passe le mapping élève → tuteur au parent. */
  onApply: (studentToTutor: Record<string, string>) => void;
  proposal: AutoAssignmentProposal | null;
  tutors: UserWithProfile[];
  students: UserWithProfile[];
  isLoading?: boolean;
}

const SOURCE_LABELS: Record<
  'auto_binome_coeur' | 'auto_balanced',
  { label: string; icon: typeof Heart; color: string }
> = {
  auto_binome_coeur: {
    label: 'Binôme cœur',
    icon: Heart,
    color: 'var(--accent-pink, #e11d48)',
  },
  auto_balanced: {
    label: 'Équilibrage',
    icon: Scale,
    color: 'var(--color-2-nuance-1)',
  },
};

/** Retourne un nom complet propre pour affichage (fallback "Utilisateur"). */
const fullName = (u?: UserWithProfile | null): string => {
  if (!u) return 'Utilisateur';
  const fn = (u.firstName ?? '').trim();
  const ln = (u.lastName ?? '').trim();
  const composed = `${fn} ${ln}`.trim();
  return composed.length > 0 ? composed : 'Utilisateur';
};

export const AutoAssignmentProposalModal: React.FC<AutoAssignmentProposalModalProps> = ({
  open,
  onClose,
  onApply,
  proposal,
  tutors,
  students,
  isLoading = false,
}) => {
  const tutorById = React.useMemo(() => new Map(tutors.map((t) => [t.id, t])), [tutors]);
  const studentById = React.useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Regroupement des paires proposées par tuteur (avec ordre stable basé sur la liste des tuteurs).
  const groupsByTutor = React.useMemo(() => {
    const map = new Map<
      string,
      Array<{ studentId: string; source: 'auto_binome_coeur' | 'auto_balanced' }>
    >();
    proposal?.proposedPairs.forEach((pair) => {
      const list = map.get(pair.tutorUserId) ?? [];
      list.push({ studentId: pair.studentUserId, source: pair.source });
      map.set(pair.tutorUserId, list);
    });
    return tutors.map((tutor) => ({
      tutor,
      pairs: map.get(tutor.id) ?? [],
    }));
  }, [proposal, tutors]);

  const unassigned = proposal?.unassignedStudentIds ?? [];
  const totalAssigned = proposal?.proposedPairs.length ?? 0;

  const handleApply = () => {
    if (!proposal) return;
    const mapping: Record<string, string> = {};
    proposal.proposedPairs.forEach((p) => {
      mapping[p.studentUserId] = p.tutorUserId;
    });
    onApply(mapping);
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="2xl"
      header={{
        icon: Sparkles,
        iconSize: 'md',
        title: 'Suggestion d’affectation automatique',
        subtitle:
          'Ceci est une suggestion. Vous pouvez l’appliquer puis l’ajuster avant de créer la séance.',
        titleSize: 'lg',
        titleWeight: 'semibold',
      }}
      hideContentWrapper
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {isLoading
              ? 'Calcul en cours…'
              : `${totalAssigned} binôme(s) proposé(s)${
                  unassigned.length > 0 ? ` · ${unassigned.length} élève(s) sans tuteur` : ''
                }`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={isLoading || !proposal || proposal.proposedPairs.length === 0}
            >
              Appliquer cette suggestion
            </Button>
          </div>
        </div>
      }
    >
      <div className="mt-2 space-y-4">
        {isLoading && (
          <div
            className="rounded-2xl border-2 border-dashed p-6 text-center text-sm"
            style={{
              borderColor: 'var(--color-1-nuance-3)',
              color: 'var(--muted-foreground)',
            }}
          >
            Recherche d’une affectation optimale…
          </div>
        )}

        {!isLoading && proposal && proposal.proposedPairs.length === 0 && (
          <div
            className="rounded-2xl border-2 p-5 text-sm"
            style={{
              borderColor: 'var(--color-1-nuance-3)',
              background: 'color-mix(in srgb, var(--color-1-nuance-3) 4%, transparent)',
              color: 'var(--muted-foreground)',
            }}
          >
            Aucun binôme n’a pu être proposé pour cette configuration. Vérifiez que les tuteurs et
            élèves sélectionnés sont compatibles (établissement, disponibilité…).
          </div>
        )}

        {!isLoading && proposal && proposal.proposedPairs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groupsByTutor.map(({ tutor, pairs }) => (
              <div
                key={tutor.id}
                className="rounded-2xl border-2 p-4"
                style={{
                  borderColor: 'var(--color-1-nuance-3)',
                  background: 'color-mix(in srgb, var(--color-1-nuance-3) 3%, transparent)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                    }}
                  >
                    <UserCircle2 className="h-5 w-5" style={{ color: 'var(--color-2-nuance-1)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold">{fullName(tutor)}</div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {pairs.length} élève{pairs.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {pairs.length === 0 ? (
                  <p className="mt-3 text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
                    Aucun élève proposé pour ce tuteur.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {pairs.map((p) => {
                      const student = studentById.get(p.studentId);
                      const meta = SOURCE_LABELS[p.source];
                      const SourceIcon = meta.icon;
                      return (
                        <li
                          key={p.studentId}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                          style={{
                            background: 'color-mix(in srgb, var(--background) 60%, transparent)',
                          }}
                        >
                          <span className="truncate text-sm">{fullName(student)}</span>
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              color: meta.color,
                              background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                            }}
                            title={meta.label}
                          >
                            <SourceIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && unassigned.length > 0 && (
          <div
            className="rounded-2xl border-2 p-4"
            style={{
              borderColor: 'var(--accent-orange, #f59e0b)',
              background: 'color-mix(in srgb, var(--accent-orange, #f59e0b) 8%, transparent)',
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4"
                style={{ color: 'var(--accent-orange, #f59e0b)' }}
              />
              <span className="text-sm font-medium">
                {unassigned.length} élève(s) sans tuteur dans cette suggestion
              </span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {unassigned.map((sid) => (
                <li
                  key={sid}
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    background:
                      'color-mix(in srgb, var(--accent-orange, #f59e0b) 14%, transparent)',
                    color: 'var(--accent-orange, #f59e0b)',
                  }}
                >
                  {fullName(studentById.get(sid))}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Vous pourrez les affecter manuellement après avoir appliqué la suggestion.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
