import { InterfaceElement } from '@/types/interface-elements.types';

/**
 * MenuItem extends InterfaceElement with children for hierarchical structure
 */
export interface MenuItem extends InterfaceElement {
  children?: MenuItem[];
}

/**
 * Build hierarchical menu tree from flat interface elements array
 * Filters for menu type elements and constructs parent-child relationships
 *
 * @param elements - Flat array of interface elements from API
 * @returns Hierarchical array of root menu items with nested children
 */
export function buildMenuTree(elements: InterfaceElement[]): MenuItem[] {
  // Filter only menu type elements
  const menus = elements.filter((el) => el.elementType === 'menu');

  if (menus.length === 0) {
    return [];
  }

  // Create map for quick access by elementId
  const map = new Map<string, MenuItem>();
  menus.forEach((menu) => {
    map.set(menu.elementId, { ...menu, children: [] });
  });

  // Build hierarchical tree structure
  const roots: MenuItem[] = [];

  menus.forEach((menu) => {
    const parentId = menu.config?.parentId as string | undefined;
    const menuItem = map.get(menu.elementId);

    if (!menuItem) return;

    if (parentId) {
      // Child menu - find parent and add to its children
      const parent = map.get(parentId);
      if (parent) {
        parent.children ??= [];
        parent.children.push(menuItem);
      } else {
        // Parent not found, treat as root (fallback)
        roots.push(menuItem);
      }
    } else {
      // Root level menu
      roots.push(menuItem);
    }
  });

  // Sort menus recursively: userOrder > role order > Infinity (NULL → end)
  const sortMenus = (items: MenuItem[]) => {
    items.sort((a, b) => {
      const orderA = a.userOrder ?? a.order ?? Infinity;
      const orderB = b.userOrder ?? b.order ?? Infinity;
      return orderA - orderB;
    });

    // Recursively sort children
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortMenus(item.children);
      }
    });
  };

  sortMenus(roots);

  return roots;
}

/**
 * Flatten menu tree back to array (useful for search/filtering)
 *
 * @param menus - Hierarchical menu tree
 * @returns Flat array of all menu items
 */
export function flattenMenuTree(menus: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];

  const flatten = (items: MenuItem[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        flatten(item.children);
      }
    });
  };

  flatten(menus);
  return result;
}

/**
 * Find menu item by elementId in tree
 *
 * @param menus - Hierarchical menu tree
 * @param elementId - Element ID to search for
 * @returns Found menu item or undefined
 */
export function findMenuById(menus: MenuItem[], elementId: string): MenuItem | undefined {
  for (const menu of menus) {
    if (menu.elementId === elementId) {
      return menu;
    }
    if (menu.children && menu.children.length > 0) {
      const found = findMenuById(menu.children, elementId);
      if (found) return found;
    }
  }
  return undefined;
}
