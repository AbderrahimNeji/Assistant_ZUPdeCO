import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCoordinators } from '@/services/users.service';

export const useCoordinatorsAutocomplete = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: coordinatorsResponse, isLoading } = useQuery({
    queryKey: ['coordinators', 'search', debouncedQuery],
    queryFn: () => getCoordinators({ search: debouncedQuery, pageSize: 20 }),
    enabled: debouncedQuery.length >= 2 || debouncedQuery === '',
  });

  const coordinators = coordinatorsResponse?.data || [];

  const options = coordinators.map((coordinator) => ({
    value: coordinator.id,
    label:
      `${coordinator.firstName || ''} ${coordinator.lastName || ''}`.trim() ||
      coordinator.email ||
      coordinator.id,
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
