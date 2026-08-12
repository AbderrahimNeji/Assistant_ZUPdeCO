import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import { searchService } from '@/services/search.service';
import { useDynamicSearchMenus } from '@/hooks/useDynamicSearchMenus';
import {
  GlobalSearchResponse,
  MenuSearchResult,
  SearchResultItem,
  SearchResultType,
} from '@/types/search.types';
import * as React from 'react';

/**
 * Normalise une chaîne pour la recherche : enlève les accents et met en minuscules
 */
const normalizeForSearch = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

interface UseGlobalSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoadingData: boolean;
  hasApiResponded: boolean;
  dataResults: GlobalSearchResponse['data'] | null;
  menuResults: MenuSearchResult[];
  allResults: SearchResultItem[];
  allDataResults: SearchResultItem[];
  allMenuResultsMapped: SearchResultItem[];
  paginatedMenuResults: SearchResultItem[];
  totalDataCount: number;
  hasDataResults: boolean;
  hasMenuResults: boolean;
  hasAnyResults: boolean;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  menuPage: number;
  setMenuPage: (page: number) => void;
  dataPage: number;
  setDataPage: (page: number) => void;
  clearSearch: () => void;
}

export const useGlobalSearch = (): UseGlobalSearchReturn => {
  const dynamicMenus = useDynamicSearchMenus();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasApiResponded, setHasApiResponded] = useState(false);
  const [dataResults, setDataResults] = useState<GlobalSearchResponse['data'] | null>(null);
  const [menuResults, setMenuResults] = useState<MenuSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuPage, setMenuPage] = useState(1);
  const [dataPage, setDataPage] = useState(1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterMenusLocally = useCallback(
    (query: string): MenuSearchResult[] => {
      if (!query || query.length < 2) return [];

      const normalizedQuery = normalizeForSearch(query);
      const elementsByInterface = useInterfaceElementsStore.getState().elementsByInterface;

      // Build a map of accessible resources from sidebar menus
      const sidebarMenus = elementsByInterface['sidebar'] || [];
      const accessibleResources = new Set<string>();

      // Extract resource names from sidebar menu IDs
      // e.g., 'menu-students' -> 'students', 'menu-tutors' -> 'tutors'
      sidebarMenus.forEach((element) => {
        if (element.elementId.startsWith('menu-')) {
          const resource = element.elementId.replace('menu-', '');
          accessibleResources.add(resource);
        }
      });

      const filtered = dynamicMenus.filter((menu) => {
        if (menu.hidden) {
          return false;
        }

        // Check if user has access to this resource via the sidebar
        // The sidebar contains 'menu-{resource}' entries for each accessible resource
        const hasAccess =
          accessibleResources.has(menu.resource) || elementsByInterface[menu.resource]?.length > 0;

        if (!hasAccess) {
          return false;
        }

        if (menu.requiresWrite || menu.type === 'create') {
          // For "create" menus, check if user has the action-create permission
          // We need to check if the resource interface is loaded first
          const resourceElements = elementsByInterface[menu.resource];

          if (resourceElements && resourceElements.length > 0) {
            // Resource interface is loaded, check for action-create
            const canCreate = !!resourceElements.find((el) => el.elementId === 'action-create');

            if (!canCreate) {
              return false;
            }
          }
          // If resource interface not loaded, assume write access based on sidebar presence
        }

        // Check if menu requires access to a specific interface element (e.g., tabs)
        if (menu.requiredElement) {
          // Modèle présence : l'élément existe dans le store = accès accordé
          const storeElements =
            useInterfaceElementsStore.getState().elementsByInterface[
              menu.requiredElement.interface
            ];
          const element = (storeElements ?? []).find(
            (el) => el.elementId === menu.requiredElement!.elementId,
          );

          if (!element) {
            return false;
          }
        }

        // Hide generic group menus if user only has access to ONE tab/role in that group
        if (menu.excludeIfSingleAdminTab) {
          const resourceElements = elementsByInterface[menu.resource];
          if (resourceElements) {
            // Count how many tabs the user can see
            const accessibleTabs = resourceElements.filter((el) => el.elementType === 'tab');
            if (accessibleTabs.length <= 1) {
              return false;
            }
          }
        }

        const matchesKeywords = menu.keywords.some((keyword) =>
          normalizeForSearch(keyword).includes(normalizedQuery),
        );
        const matchesLabel = normalizeForSearch(menu.label).includes(normalizedQuery);

        return matchesKeywords || matchesLabel;
      });

      return filtered;
    },
    [dynamicMenus],
  );

  const fetchDataFromApi = async (query: string) => {
    if (query.length < 2) {
      setDataResults(null);
      setIsLoadingData(false);
      setHasApiResponded(false);
      return;
    }

    setIsLoadingData(true);
    setHasApiResponded(false);
    try {
      const response = await searchService.globalSearch(query, dataPage, 5);
      setDataResults(response.data);
      setHasApiResponded(true);
    } catch (error) {
      console.error('[useGlobalSearch] API error:', error);
      setDataResults(null);
      setHasApiResponded(true);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const filteredMenus = filterMenusLocally(searchQuery);
    setMenuResults(filteredMenus);

    if (searchQuery.length >= 2) {
      setShowDropdown(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchDataFromApi(searchQuery);
      }, 300);
    } else if (searchQuery.length > 0) {
      setShowDropdown(true);
      setDataResults(null);
      setIsLoadingData(false);
      setHasApiResponded(false);
    } else {
      setShowDropdown(false);
      setDataResults(null);
      setIsLoadingData(false);
      setHasApiResponded(false);
      setMenuResults([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, dataPage]);

  // Réinitialiser dataPage à 1 quand searchQuery change
  useEffect(() => {
    setDataPage(1);
  }, [searchQuery]);

  const allDataResults = React.useMemo(() => {
    if (!dataResults) return [];

    const results: SearchResultItem[] = [];
    const iconColorMap: Record<SearchResultType, 'color-1' | 'color-2' | 'color-3'> = {
      tutor: 'color-1',
      student: 'color-2',
      volunteer: 'color-3',
      admin: 'color-1',
      establishment: 'color-2',
    };

    const iconMap: Record<SearchResultType, string> = {
      tutor: 'GraduationCap',
      student: 'User',
      volunteer: 'Heart',
      admin: 'Shield',
      establishment: 'Building2',
    };

    if (dataResults.tutors?.data && dataResults.tutors.data.length > 0) {
      dataResults.tutors.data.forEach((tutor) => {
        results.push({
          id: tutor.id,
          type: 'tutor' as const,
          label: `${tutor.firstName} ${tutor.lastName}`,
          sublabel: 'Tuteur',
          icon: iconMap.tutor,
          iconColor: iconColorMap.tutor,
          route: `/dashboard/tutors?view=${tutor.id}`,
          data: tutor,
        });
      });
    }

    if (dataResults.students?.data && dataResults.students.data.length > 0) {
      dataResults.students.data.forEach((student) => {
        results.push({
          id: student.id,
          type: 'student' as const,
          label: student.displayName || `${student.firstName} ${student.lastName}`.trim(),
          sublabel: 'Élève',
          icon: iconMap.student,
          iconColor: iconColorMap.student,
          route: `/dashboard/students?view=${student.id}`,
          data: student,
        });
      });
    }

    if (dataResults.volunteers?.data && dataResults.volunteers.data.length > 0) {
      dataResults.volunteers.data.forEach((volunteer) => {
        results.push({
          id: volunteer.id,
          type: 'volunteer' as const,
          label: `${volunteer.firstName} ${volunteer.lastName}`,
          sublabel: 'VSC',
          icon: iconMap.volunteer,
          iconColor: iconColorMap.volunteer,
          route: `/dashboard/volunteers?view=${volunteer.id}`,
          data: volunteer,
        });
      });
    }

    if (dataResults.admins?.data && dataResults.admins.data.length > 0) {
      dataResults.admins.data.forEach((admin) => {
        const tab = admin.roleCode.toLowerCase();

        results.push({
          id: admin.id,
          type: 'admin' as const,
          label: `${admin.firstName} ${admin.lastName}`,
          sublabel: admin.roleLabel,
          icon: iconMap.admin,
          iconColor: iconColorMap.admin,
          route: `/dashboard/admins?tab=${tab}&view=${admin.id}`,
          data: admin,
        });
      });
    }

    if (dataResults.establishments?.data && dataResults.establishments.data.length > 0) {
      dataResults.establishments.data.forEach((establishment) => {
        results.push({
          id: establishment.id,
          type: 'establishment' as const,
          label: establishment.name,
          sublabel: 'Établissement',
          icon: iconMap.establishment,
          iconColor: iconColorMap.establishment,
          route: `/dashboard/establishments?view=${establishment.id}`,
          data: establishment,
        });
      });
    }

    return results;
  }, [dataResults]);

  const allMenuResultsMapped = React.useMemo(() => {
    const colorCycle: Array<'color-1' | 'color-2' | 'color-3'> = ['color-1', 'color-2', 'color-3'];

    return menuResults.map((menu, index) => ({
      id: menu.id,
      type: 'menu' as const,
      label: menu.label,
      sublabel: menu.type === 'create' ? 'Action' : 'Navigation',
      icon: menu.icon,
      iconColor: colorCycle[index % 3],
      route: menu.route,
    }));
  }, [menuResults]);
  const allResults = React.useMemo(
    () => [...allDataResults, ...allMenuResultsMapped],
    [allDataResults, allMenuResultsMapped],
  );

  const hasDataResults = allDataResults.length > 0;
  const hasMenuResults = allMenuResultsMapped.length > 0;
  const hasAnyResults = hasDataResults || hasMenuResults;

  const paginatedMenuResults = React.useMemo(() => {
    const startIndex = (menuPage - 1) * 5;
    const endIndex = startIndex + 5;
    return allMenuResultsMapped.slice(startIndex, endIndex);
  }, [allMenuResultsMapped, menuPage]);

  const totalDataCount = React.useMemo(() => {
    if (!dataResults) return 0;
    // Since backend now paginates globally, all entities have the same total
    // Use tutors.total as it represents the global total
    return dataResults.tutors.total;
  }, [dataResults]);

  const clearSearch = () => {
    setSearchQuery('');
    setDataResults(null);
    setMenuResults([]);
    setShowDropdown(false);
    setMenuPage(1);
    setDataPage(1);
    setHasApiResponded(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    isLoadingData,
    hasApiResponded,
    dataResults,
    menuResults,
    allResults,
    allDataResults,
    allMenuResultsMapped,
    paginatedMenuResults,
    totalDataCount,
    hasDataResults,
    hasMenuResults,
    hasAnyResults,
    showDropdown,
    setShowDropdown,
    menuPage,
    setMenuPage,
    dataPage,
    setDataPage,
    clearSearch,
  };
};
