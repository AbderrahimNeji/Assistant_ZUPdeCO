import { useQuery } from '@tanstack/react-query';

import { fetchComptesRendus } from '@/services/comptesRendus';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Liste des comptes rendus — rafraîchie au montage / focus pour rester alignée
 * avec les modifications faites depuis le web (statut, validation, présences…).
 */
export function useComptesRendus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['comptes-rendus'],
    queryFn: fetchComptesRendus,
    enabled: !!user,
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
