import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LevelBadgeImage } from '@/components/gamification/LevelBadgeImage';
import { tierFromNumero, isRemoteIconUrl } from '@/utils/levelBadge';
import type { LeaderboardEntry } from '@/types/gamification.types';

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const showBadge =
    Boolean(entry.levelBadge) ||
    tierFromNumero(entry.currentNiveau?.numero) != null ||
    isRemoteIconUrl(entry.currentNiveau?.icone);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
        #{entry.rank}
      </span>
      {showBadge ? (
        <LevelBadgeImage
          size={36}
          levelBadge={entry.levelBadge}
          niveauNumero={entry.currentNiveau?.numero}
          niveauIcone={entry.currentNiveau?.icone}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{entry.displayName}</p>
        {entry.currentNiveau ? (
          <p className="truncate text-sm text-muted-foreground">{entry.currentNiveau.nom}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-sm font-bold text-[var(--color-1-nuance-1)]">
        {entry.totalXp} XP
      </span>
    </div>
  );
}

export const GamificationLeaderboardPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useLeaderboard(20);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredEntries = React.useMemo(() => {
    if (!data?.entries) return [];
    if (!searchQuery.trim()) return data.entries;
    const q = searchQuery.toLowerCase();
    return data.entries.filter((e) => e.displayName.toLowerCase().includes(q));
  }, [data?.entries, searchQuery]);

  const showMyPositionOutsideTop = React.useMemo(() => {
    if (!data?.myEntry || data.myRank <= 0) return false;
    const me = data.myEntry;
    const inTopList = data.entries.some((e) =>
      me.userId ? e.userId === me.userId : e.rank === data.myRank,
    );
    return !inTopList;
  }, [data]);

  return (
    <div className="management-page">
      <PageHeader title="Classement (XP)" subtitle="Top tuteurs / bénévoles par expérience" />
      <div className="management-page-content max-w-3xl space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un tuteur par nom..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-[rgb(var(--card-rgb)/0.3)] text-sm focus:outline-none focus:border-[var(--color-2-nuance-1)]"
          />
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement…
          </div>
        ) : null}
        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="text-destructive-foreground">
              {(error as Error)?.message ?? 'Impossible de charger le classement.'}
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-medium text-[var(--color-1-nuance-1)] hover:underline"
              onClick={() => void refetch()}
            >
              Réessayer
            </button>
          </div>
        ) : null}
        {filteredEntries.length > 0 ? (
          <ul className="space-y-2 list-none p-0 m-0">
            {filteredEntries.map((entry) => (
              <li key={entry.userId ?? `${entry.rank}-${entry.displayName}`}>
                <EntryRow entry={entry} />
              </li>
            ))}
          </ul>
        ) : null}
        {!isLoading && !isError && data && filteredEntries.length === 0 ? (
          <p className="text-muted-foreground">
            {searchQuery
              ? 'Aucun tuteur trouvé pour cette recherche.'
              : 'Aucune entrée dans le classement.'}
          </p>
        ) : null}
        {showMyPositionOutsideTop && data?.myEntry && !searchQuery ? (
          <div className="pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Votre position</h3>
            <EntryRow entry={{ ...data.myEntry, rank: data.myRank }} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
