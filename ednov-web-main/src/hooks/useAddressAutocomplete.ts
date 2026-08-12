import { useState, useEffect, useRef, useCallback } from 'react';
import { getDepartmentByPostalCode } from '@/data/departments';

export interface AddressSuggestion {
  label: string;
  value: string;
  context?: string;
  postalCode?: string;
  city?: string;
  coordinates?: {
    lng: number;
    lat: number;
  };
}

export interface AddressSelectionResult {
  addressLine1: string;
  postalCode: string;
  city: string;
  department: string;
  country: string;
}

interface UseAddressAutocompleteOptions {
  minCharacters?: number;
  debounceMs?: number;
  onSelection: (result: AddressSelectionResult) => void;
}

interface ApiAddressFeature {
  properties: {
    label: string;
    context?: string;
    postcode?: string;
    city?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface ApiAddressResponse {
  features: ApiAddressFeature[];
}

export function useAddressAutocomplete({
  minCharacters = 3,
  debounceMs = 300,
  onSelection,
}: UseAddressAutocompleteOptions) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minCharacters) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=5&autocomplete=1`;

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ApiAddressResponse = await response.json();

        const mappedSuggestions: AddressSuggestion[] = (data.features || []).map((feature) => ({
          label: feature.properties.label,
          value: feature.properties.label,
          context: feature.properties.context,
          postalCode: feature.properties.postcode,
          city: feature.properties.city,
          coordinates: {
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
          },
        }));

        setSuggestions(mappedSuggestions);
        setIsOpen(mappedSuggestions.length > 0);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError("Erreur lors de la recherche d'adresse");
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [minCharacters],
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query || query.length < minCharacters) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, minCharacters, debounceMs, fetchSuggestions]);

  const handleSelectSuggestion = useCallback(
    (suggestion: AddressSuggestion) => {
      const postalCode = suggestion.postalCode || '';
      const city = suggestion.city || '';
      const addressLine1 = suggestion.value;

      const departmentData = postalCode ? getDepartmentByPostalCode(postalCode) : null;
      const department = departmentData ? `${departmentData.name} (${departmentData.code})` : '';

      onSelection({
        addressLine1,
        postalCode,
        city,
        department,
        country: 'FR',
      });

      setIsOpen(false);
    },
    [onSelection],
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    isOpen,
    handleSelectSuggestion,
    clearSuggestions,
  };
}
