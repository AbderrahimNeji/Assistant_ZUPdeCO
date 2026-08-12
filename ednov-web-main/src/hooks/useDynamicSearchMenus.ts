import * as React from 'react';
import { SEARCH_MENUS } from '@/constants/search-menus';
import { resolveSidebarRoutePath } from '@/constants/sidebar-routes';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import type { MenuSearchResult } from '@/types/search.types';

/**
 * Builds dynamic search menu entries from interface elements that are already loaded
 * in the store (specifically tabs and create options from the 'admins' interface).
 *
 * These elements are loaded from the database at login and cached in localStorage,
 * so we don't need to fetch them separately.
 */

/**
 * Static menu IDs that are generated dynamically (to avoid duplicates when merging).
 * These are removed from the base SEARCH_MENUS when dynamic generation is active.
 */
const DYNAMIC_MENUS_TO_EXCLUDE = [
  // Admin menus (always generated dynamically)
  'menu-admins-view-admin',
  'menu-admins-view-superadmin',
  'menu-admins-view-coordinator',
  'menu-admins-view-manager',
  'menu-admins-create-admin',
  'menu-admins-create-superadmin',
  'menu-admins-create-coordinator',
  'menu-admins-create-manager',
  // Tutors generic menus (replaced by dynamic generation when 2+ tabs)
  'menu-tutors-view',
  'menu-tutors-create',
  // Volunteers generic menus (replaced by dynamic generation when 2+ tabs)
  'menu-volunteers-view',
  'menu-volunteers-create',
];

const rolesManagementMenus: MenuSearchResult[] = [
  {
    id: 'menu-roles-view',
    label: 'Gérer les rôles',
    type: 'view',
    route: '/dashboard/roles',
    icon: 'Shield',
    keywords: ['rôles', 'roles', 'gestion', 'permissions', 'accès'],
    resource: 'roles',
  },
  {
    id: 'menu-roles-create',
    label: 'Créer un rôle',
    type: 'create',
    route: '/dashboard/roles?create=true',
    icon: 'Shield',
    keywords: ['rôle', 'role', 'créer', 'ajouter', 'nouveau'],
    resource: 'roles',
    requiresWrite: true,
  },
];

/**
 * Builds dynamic search menu entries from interface elements that are already loaded
 * in the store.
 *
 * Three sources:
 * 1. Sidebar menus (menu-admins, menu-tutors, menu-volunteers, etc.) - generic menus
 * 2. Tabs from multiple interfaces (admins, tutors, volunteers) - specific role/type menus
 * 3. Create options from multiple interfaces - create actions
 */
export const useDynamicSearchMenus = (): MenuSearchResult[] => {
  const elementsByInterface = useInterfaceElementsStore((state) => state.elementsByInterface);
  const sidebarElements = elementsByInterface['sidebar'] || [];
  const adminsElements = elementsByInterface['admins'] || [];
  const tutorsElements = elementsByInterface['tutors'] || [];
  const volunteersElements = elementsByInterface['volunteers'] || [];

  const dynamicMenus = React.useMemo<MenuSearchResult[]>(() => {
    // Base menus without the dynamically generated entries
    const baseMenus = SEARCH_MENUS.filter((m) => !DYNAMIC_MENUS_TO_EXCLUDE.includes(m.id));

    // Generate menus from SIDEBAR (generic resource menus like "Établissements", "Séances", etc.)
    // Exclude menus that already exist in hardcoded SEARCH_MENUS
    // Also exclude admins/tutors/volunteers as they are handled by dynamic generation
    const existingMenuResources = new Set(
      baseMenus.filter((m) => m.type === 'view').map((m) => m.resource),
    );
    const groupResourceMenus = new Set(['admins', 'tutors', 'volunteers']);

    const sidebarMenus = sidebarElements
      .filter((el) => {
        if (el.elementType !== 'menu' || !el.elementId.startsWith('menu-')) return false;
        const resource = el.elementId.replace('menu-', '');
        // Skip if already in hardcoded menus OR if it's a group resource menu
        return !existingMenuResources.has(resource) && !groupResourceMenus.has(resource);
      })
      .map((menu): MenuSearchResult => {
        const resource = menu.elementId.replace('menu-', '');
        const route =
          resolveSidebarRoutePath(menu) ?? `/dashboard/${resource}`;

        return {
          id: `global-search-${menu.elementId}`,
          label: `Consulter ${menu.elementLabel.toLowerCase()}`,
          type: 'view' as const,
          route,
          icon: 'Users',
          keywords: [resource, menu.elementLabel.toLowerCase(), 'consulter', 'voir'],
          resource,
        };
      });

    // Helper function to generate tab menus
    const generateTabMenus = (
      elements: any[],
      interfaceName: string,
      defaultIcon: string,
    ): MenuSearchResult[] => {
      const tabs = elements.filter((el) => el.elementType === 'tab');

      return tabs.map((tab) => {
        const code = tab.elementId.replace('tab-', '').toLowerCase();

        return {
          id: `menu-${interfaceName}-view-${code}`,
          label: `Consulter les ${tab.elementLabel}`,
          type: 'view' as const,
          route: `/dashboard/${interfaceName}?tab=${code}`,
          icon: defaultIcon,
          keywords: [code, tab.elementLabel.toLowerCase(), 'consulter', 'voir', interfaceName],
          resource: interfaceName,
          requiredElement: { interface: interfaceName, elementId: tab.elementId },
        };
      });
    };

    // Helper function to generate create menus
    const generateCreateMenus = (elements: any[], interfaceName: string): MenuSearchResult[] => {
      const createOptions = elements.filter((el) => el.elementId.startsWith('option-create-'));

      return createOptions.map((option) => {
        const code = option.elementId.replace('option-create-', '').toLowerCase();

        return {
          id: `menu-${interfaceName}-create-${code}`,
          label: option.elementLabel.startsWith('Créer')
            ? option.elementLabel
            : `Créer un ${option.elementLabel}`,
          type: 'create' as const,
          route: `/dashboard/${interfaceName}?create=true&role=${code}`,
          icon: 'UserPlus',
          keywords: [code, option.elementLabel.toLowerCase(), 'créer', 'ajouter', 'nouveau'],
          resource: interfaceName,
          requiresWrite: true,
          requiredElement: { interface: interfaceName, elementId: option.elementId },
        };
      });
    };

    // Generate menus for ADMINS
    const adminsTabMenus = generateTabMenus(adminsElements, 'admins', 'Shield');
    const adminsCreateMenus = generateCreateMenus(adminsElements, 'admins');

    // Generic menu for admins (if 2+ tabs)
    const adminsGenericMenus: MenuSearchResult[] = [];
    if (adminsTabMenus.length >= 2) {
      adminsGenericMenus.push({
        id: 'menu-admins-view',
        label: 'Consulter les administrateurs',
        type: 'view' as const,
        route: '/dashboard/admins',
        icon: 'Shield',
        keywords: ['administrateurs', 'admins', 'consulter', 'voir', 'collaborateurs'],
        resource: 'admins',
        excludeIfSingleAdminTab: true,
      });
    }
    if (adminsCreateMenus.length >= 2) {
      adminsGenericMenus.push({
        id: 'menu-admins-create',
        label: 'Créer un administrateur',
        type: 'create' as const,
        route: '/dashboard/admins?create=true',
        icon: 'UserPlus',
        keywords: ['administrateur', 'admin', 'créer', 'ajouter', 'nouveau', 'collaborateur'],
        resource: 'admins',
        requiresWrite: true,
        excludeIfSingleAdminTab: true,
      });
    }

    // Generate menus for TUTORS
    const tutorsTabMenus = generateTabMenus(tutorsElements, 'tutors', 'GraduationCap');
    const tutorsCreateMenus = generateCreateMenus(tutorsElements, 'tutors');

    // Generic menu for tutors (if 2+ tabs)
    const tutorsGenericMenus: MenuSearchResult[] = [];
    if (tutorsTabMenus.length >= 2) {
      tutorsGenericMenus.push({
        id: 'menu-tutors-view',
        label: 'Consulter les tuteurs',
        type: 'view' as const,
        route: '/dashboard/tutors',
        icon: 'GraduationCap',
        keywords: ['tuteurs', 'tutors', 'consulter', 'voir'],
        resource: 'tutors',
        excludeIfSingleAdminTab: true,
      });
    }
    if (tutorsCreateMenus.length >= 2) {
      tutorsGenericMenus.push({
        id: 'menu-tutors-create',
        label: 'Créer un tuteur',
        type: 'create' as const,
        route: '/dashboard/tutors?create=true',
        icon: 'UserPlus',
        keywords: ['tuteur', 'tutor', 'créer', 'ajouter', 'nouveau'],
        resource: 'tutors',
        requiresWrite: true,
        excludeIfSingleAdminTab: true,
      });
    }

    // Generate menus for VOLUNTEERS
    const volunteersTabMenus = generateTabMenus(volunteersElements, 'volunteers', 'Heart');
    const volunteersCreateMenus = generateCreateMenus(volunteersElements, 'volunteers');

    // Generic menu for volunteers (if 2+ tabs)
    const volunteersGenericMenus: MenuSearchResult[] = [];
    if (volunteersTabMenus.length >= 2) {
      volunteersGenericMenus.push({
        id: 'menu-volunteers-view',
        label: 'Consulter les volontaires',
        type: 'view' as const,
        route: '/dashboard/volunteers',
        icon: 'Heart',
        keywords: ['volontaires', 'volunteers', 'vsc', 'consulter', 'voir'],
        resource: 'volunteers',
        excludeIfSingleAdminTab: true,
      });
    }
    if (volunteersCreateMenus.length >= 2) {
      volunteersGenericMenus.push({
        id: 'menu-volunteers-create',
        label: 'Créer un volontaire',
        type: 'create' as const,
        route: '/dashboard/volunteers?create=true',
        icon: 'UserPlus',
        keywords: ['volontaire', 'volunteer', 'vsc', 'créer', 'ajouter', 'nouveau'],
        resource: 'volunteers',
        requiresWrite: true,
        excludeIfSingleAdminTab: true,
      });
    }

    return [
      ...baseMenus,
      ...sidebarMenus,
      ...adminsGenericMenus,
      ...adminsTabMenus,
      ...adminsCreateMenus,
      ...tutorsGenericMenus,
      ...tutorsTabMenus,
      ...tutorsCreateMenus,
      ...volunteersGenericMenus,
      ...volunteersTabMenus,
      ...volunteersCreateMenus,
      ...rolesManagementMenus,
    ];
  }, [sidebarElements, adminsElements, tutorsElements, volunteersElements]);

  return dynamicMenus;
};
