import * as React from 'react';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { useRoles } from '@/hooks/useRoles';
import { resolveBrandingColor } from '@/utils/branding';

export interface RoleGroupTab {
  id: string;
  label: string;
  icon: string;
  color: string | null;
}

export interface UseRoleGroupTabsReturn {
  visibleTabs: RoleGroupTab[];
  showTabBar: boolean;
  activeRoleFilter: string;
  setActiveRoleFilter: (role: string) => void;
  enabledRoles: string[];
  roleByCode: Record<string, { icon?: string | null; color?: string | null; label: string }>;
}

/**
 * Shared hook that drives tab navigation for all role group management pages.
 *
 * Reads tab IE children of `menuId` inside `interfaceName`, resolves icon/color
 * from the live roles API, and manages the active tab state.
 *
 * Used by DynamicRoleGroupManagementPage, TutorsManagementPage, VolunteersManagementPage.
 */
export function useRoleGroupTabs(interfaceName: string, menuId: string): UseRoleGroupTabsReturn {
  const { allElements: pageElements = [] } = useInterfaceElements(interfaceName);
  const { data: allRoles = [] } = useRoles();
  const [activeRoleFilter, setActiveRoleFilter] = React.useState<string>('all');

  const roleByCode = React.useMemo(
    () => Object.fromEntries(allRoles.map((r) => [r.code.toLowerCase(), r])),
    [allRoles],
  );

  const visibleTabs = React.useMemo<RoleGroupTab[]>(() => {
    const tabs = pageElements.filter((el) => el.elementType === 'tab');
    return [...tabs]
      .sort((a, b) => (a.userOrder ?? a.order ?? Infinity) - (b.userOrder ?? b.order ?? Infinity))
      .map((el) => {
        const roleCode = el.elementId.replace('tab-', '');
        const role = roleByCode[roleCode];
        return {
          id: roleCode,
          label: el.elementLabel,
          icon: role?.icon ?? (el.config?.icon as string | undefined) ?? 'Users',
          color: resolveBrandingColor(role?.color) ?? null,
        };
      });
  }, [pageElements, menuId, roleByCode]);

  const showTabBar = visibleTabs.length > 1;

  React.useEffect(() => {
    if (visibleTabs.length === 1) {
      setActiveRoleFilter(visibleTabs[0].id);
    } else if (visibleTabs.length > 1 && !visibleTabs.some((t) => t.id === activeRoleFilter)) {
      setActiveRoleFilter('all');
    }
  }, [visibleTabs, activeRoleFilter]);

  const enabledRoles = React.useMemo<string[]>(() => {
    if (activeRoleFilter === 'all') return visibleTabs.map((t) => t.id);
    return [activeRoleFilter];
  }, [activeRoleFilter, visibleTabs]);

  return {
    visibleTabs,
    showTabBar,
    activeRoleFilter,
    setActiveRoleFilter,
    enabledRoles,
    roleByCode,
  };
}
