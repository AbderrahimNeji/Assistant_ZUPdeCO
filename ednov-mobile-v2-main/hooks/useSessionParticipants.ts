import { useQuery } from '@tanstack/react-query';

import { fetchSessionParticipants } from '@/services/sessions';

/**
 * Présences d'une séance — toujours rafraîchies lors du montage / retour app pour
 * éviter les désynchronisations entre web et mobile (le web peut modifier les
 * statuts/motifs/commentaires d'absence à tout moment via PATCH CR ou PATCH participant).
 *
 * - `staleTime: 0` + `refetchOnMount: 'always'` → le cache persisté sert au démarrage
 *   et hors ligne, mais une requête fraîche part dès que l'utilisateur ouvre un écran
 *   qui consomme cette donnée.
 * - `refetchOnWindowFocus: true` → resynchro au retour foreground (cf. focusManager).
 * - `refetchOnReconnect: true` → resynchro au retour de connexion.
 */
export function useSessionParticipants(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId, 'participants'],
    queryFn: () => fetchSessionParticipants(sessionId!),
    enabled: !!sessionId,
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
