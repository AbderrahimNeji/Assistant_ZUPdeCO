import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getManagers } from '@/services/users.service';

export const useManagersAutocomplete = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: managersResponse, isLoading } = useQuery({
    queryKey: ['managers', 'search', debouncedQuery],
    queryFn: () => getManagers({ search: debouncedQuery, pageSize: 20 }),
    enabled: debouncedQuery.length >= 2 || debouncedQuery === '',
  });

  const managers = managersResponse?.data || [];

  const options = managers.map((manager) => ({
    value: manager.id,
    label:
      `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email || manager.id,
  }));

  const onSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  }, []);

  return {
    options,
    isLoading,
    onSearch,
    searchQuery,
  };
};
