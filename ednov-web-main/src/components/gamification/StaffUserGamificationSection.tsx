import * as React from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useGamificationForUser } from '@/hooks/useGamificationForUser';
import { LevelBadgeImage } from '@/components/gamification/LevelBadgeImage';
import { displayLabelForNumero, tierFromNumero, isRemoteIconUrl } from '@/utils/levelBadge';

export interface StaffUserGamificationSectionProps {
  userId: string;
}

export const StaffUserGamificationSection: React.FC<StaffUserGamificationSectionProps> = ({
  userId,
}) => {
  const { data, isLoading, isError, error, refetch } = useGamificationForUser(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement de la progression…
      </div>
    );
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const message =
      status === 403
        ? 'Progression non disponible (droits insuffisants ou profil non éligible).'
        : status === 404
          ? 'Utilisateur introuvable.'
          : 'Impossible de charger la progression.';

    return (
      <div className="space-y-2 py-1">
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm font-medium text-[var(--color-1-nuance-1)] hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Aucune donnée de progression.</p>;
  }

  const { currentNiveau, nextNiveau, totalXp, xpToNextLevel, xpRangeToNext, xpInCurrentLevel, levelBadge } =
    data;

  const showBadgeVisual =
    Boolean(levelBadge) ||
    tierFromNumero(currentNiveau?.numero) != null ||
    isRemoteIconUrl(currentNiveau?.icone);

  const tierLabel =
    levelBadge?.displayLabel ??
    displayLabelForNumero(currentNiveau?.numero) ??
    (currentNiveau?.nom ?? null);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      {showBadgeVisual ? (
        <LevelBadgeImage
          size={88}
          levelBadge={levelBadge}
          niveauNumero={currentNiveau?.numero}
          niveauIcone={currentNiveau?.icone}
        />
      ) : null}
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Badge de niveau
          </p>
          <p className="text-lg font-bold text-foreground">{tierLabel ?? '—'}</p>
          {currentNiveau?.nom ? (
            <p className="text-sm text-muted-foreground">Niveau : {currentNiveau.nom}</p>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-1-nuance-1)]">{totalXp} XP</p>
          {nextNiveau != null && xpToNextLevel != null && xpRangeToNext != null && xpRangeToNext > 0 ? (
            <>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-1-nuance-1)] transition-[width]"
                  style={{
                    width: `${Math.min(100, (xpInCurrentLevel / xpRangeToNext) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalXp} / {nextNiveau.xpRequis} XP vers {nextNiveau.nom}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
