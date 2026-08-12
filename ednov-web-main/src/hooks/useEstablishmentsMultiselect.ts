import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { searchEstablishments } from '@/services/establishments.service';
import type { SelectOption } from '@/components/forms/Select';
import { formatEstablishmentSelectLabel } from '@/utils/formatEstablishmentSelectLabel';
import type { Establishment } from '@/types/establishment.types';

/** Parse "Jules (34)" ou "Jules (Seine)" → { nameQuery, department } */
function parseEstablishmentQuery(raw: string): { nameQuery: string; department?: string } {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  if (match) return { nameQuery: match[1].trim(), department: match[2].trim() };
  return { nameQuery: raw };
}

/**
 * Hook for async establishment search with multi-select support.
 * Maintains a cache of selected option labels so they stay visible
 * even when the search results change.
 */
export const useEstablishmentsMultiselect = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedLabelsCache = useRef<Map<string, string>>(new Map());

  const { nameQuery, department } = parseEstablishmentQuery(searchQuery);

  const { data, isLoading } = useQuery({
    queryKey: ['establishments-multiselect-search', nameQuery, department],
    queryFn: () => searchEstablishments(nameQuery, 1, 20, department),
    enabled: nameQuery.length >= 2 || (!!department && nameQuery.length >= 1),
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /** Pre-fill labels for known establishment ids (e.g. from GET student) so MultiSelect shows tags and options before the user types a search. */
  const primeLabelCache = useCallback(
    (
      entries: Array<
        Pick<Establishment, 'name'> & { id: string } & Partial<
            Pick<Establishment, 'city' | 'department' | 'postalCode' | 'country'>
          >
      >,
    ) => {
      for (const entry of entries) {
        const name = entry.name?.trim();
        if (!entry.id || !name) continue;
        selectedLabelsCache.current.set(
          entry.id,
          formatEstablishmentSelectLabel({ ...entry, name }),
        );
      }
    },
    [],
  );

  const searchOptions: SelectOption[] =
    data?.data?.map((establishment) => {
      const label = formatEstablishmentSelectLabel(establishment);
      selectedLabelsCache.current.set(establishment.id, label);
      return {
        value: establishment.id,
        label,
      };
    }) || [];

  /**
   * Build the options for currently selected values whose labels are cached
   * but not in current search results (keeps tags visible after search clears).
   */
  const getOptionsForValues = useCallback(
    (selectedIds: string[]): SelectOption[] => {
      const searchResultIds = new Set(searchOptions.map((o) => o.value));
      const extraOptions: SelectOption[] = selectedIds
        .filter((id) => !searchResultIds.has(id) && selectedLabelsCache.current.has(id))
        .map((id) => ({
          value: id,
          label: selectedLabelsCache.current.get(id) ?? id,
        }));
      return [...extraOptions, ...searchOptions];
    },
    [searchOptions],
  );

  /**
   * Pré-alimente le cache avec des labels connus (ex: établissements déjà sélectionnés au chargement).
   */
  const preloadLabels = useCallback((entries: { id: string; label: string }[]) => {
    entries.forEach(({ id, label }) => {
      selectedLabelsCache.current.set(id, label);
    });
  }, []);

  return {
    searchOptions,
    isLoading,
    onSearch: handleSearch,
    getOptionsForValues,
    preloadLabels,
    primeLabelCache,
    searchQuery,
  };
};
