import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { searchEstablishments } from '@/services/establishments.service';
import type { SelectOption } from '@/components/forms/Select';
import { formatEstablishmentSelectLabel } from '@/utils/formatEstablishmentSelectLabel';

/** Parse "Jules (34)" ou "Jules (Seine)" → { nameQuery, department } */
function parseEstablishmentQuery(raw: string): { nameQuery: string; department?: string } {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  if (match) return { nameQuery: match[1].trim(), department: match[2].trim() };
  return { nameQuery: raw };
}

export const useEstablishmentsAutocomplete = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { nameQuery, department } = parseEstablishmentQuery(searchQuery);

  const { data, isLoading } = useQuery({
    queryKey: ['establishments-search', nameQuery, department, page],
    queryFn: () => searchEstablishments(nameQuery, page, 5, department),
    enabled: nameQuery.length >= 2 || (!!department && nameQuery.length >= 1),
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (data?.hasMore) {
      setPage((p) => p + 1);
    }
  }, [data?.hasMore]);

  const options: SelectOption[] =
    data?.data?.map((establishment) => ({
      value: establishment.id,
      label: formatEstablishmentSelectLabel(establishment),
    })) || [];

  return {
    options,
    isLoading,
    hasMore: data?.hasMore || false,
    onSearch: handleSearch,
    onLoadMore: handleLoadMore,
  };
};
