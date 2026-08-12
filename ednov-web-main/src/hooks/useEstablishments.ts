import { useQuery } from '@tanstack/react-query';
import { getEstablishments, getEstablishment } from '@/services/establishments.service';

export const useEstablishments = () => {
  return useQuery({
    queryKey: ['establishments'],
    queryFn: () => getEstablishments(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useEstablishment = (id: string) => {
  return useQuery({
    queryKey: ['establishments', id],
    queryFn: () => getEstablishment(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
