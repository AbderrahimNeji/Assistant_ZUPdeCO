import * as React from 'react';
import { Link } from 'react-router-dom';
import { useLayoutStore } from '@/stores/layoutStore';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { useTheme } from '@/hooks/useTheme';
import { MenuItem } from './MenuItem';
import { ThemeToggle } from './ThemeToggle';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterfaceElement } from '@/types/interface-elements.types';
import * as Icons from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface GroupedMenus {
  groupLabel: string;
  groupIcon: string | null;
  groupOrder: number;
  items: InterfaceElement[];
}

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, sidebarWidth, toggleSidebar, openMenus, setOpenMenus } =
    useLayoutStore();
  const { elements: sidebarElements } = useInterfaceElements('sidebar');
  const { logos, isDarkMode } = useTheme();

  const toggleGroup = (groupLabel: string) => {
    // Si le groupe est déjà ouvert, on le ferme
    if (openMenus.includes(groupLabel)) {
      setOpenMenus([]);
    } else {
      // Sinon, on ferme tous les autres et on ouvre celui-ci
      setOpenMenus([groupLabel]);
    }
  };

  // Group menus by groupLabel and separate footer items
  const { ungrouped, groups, footerItems } = React.useMemo(() => {
    const ungroupedItems: InterfaceElement[] = [];
    const footerItems: InterfaceElement[] = [];
    const groupsMap = new Map<string, GroupedMenus>();

    sidebarElements?.forEach((el) => {
      const order = el.userOrder ?? el.order ?? null;

      if (el.groupLabel) {
        if (!groupsMap.has(el.groupLabel)) {
          groupsMap.set(el.groupLabel, {
            groupLabel: el.groupLabel,
            groupIcon: el.groupIcon,
            groupOrder: el.groupOrder || 0,
            items: [],
          });
        }
        groupsMap.get(el.groupLabel)!.items.push(el);
      } else if (order >= 100) {
        footerItems.push(el);
      } else {
        ungroupedItems.push(el);
      }
    });

    // Sort groups by groupOrder
    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.groupOrder - b.groupOrder);

    // Sort items within each group
    sortedGroups.forEach((group) => {
      group.items.sort((a, b) => {
        const orderA = a.userOrder ?? a.order ?? Infinity;
        const orderB = b.userOrder ?? b.order ?? Infinity;
        return orderA - orderB;
      });
    });

    // Sort ungrouped items
    ungroupedItems.sort((a, b) => {
      const orderA = a.userOrder ?? a.order ?? Infinity;
      const orderB = b.userOrder ?? b.order ?? Infinity;
      return orderA - orderB;
    });

    // Sort footer items
    footerItems.sort((a, b) => {
      const orderA = a.userOrder ?? a.order ?? Infinity;
      const orderB = b.userOrder ?? b.order ?? Infinity;
      return orderA - orderB;
    });

    return { ungrouped: ungroupedItems, groups: sortedGroups, footerItems };
  }, [sidebarElements]);

  const currentLogo = React.useMemo(() => {
    const mode = isDarkMode ? 'dark' : 'light';
    const altMode = isDarkMode ? 'light' : 'dark';

    if (isSidebarCollapsed) {
      return (
        logos.logo2?.[mode] ||
        logos.logo2?.[altMode] ||
        logos.logo1?.[mode] ||
        logos.logo1?.[altMode] ||
        ''
      );
    }
    return logos.logo1?.[mode] || logos.logo1?.[altMode] || '';
  }, [isSidebarCollapsed, isDarkMode, logos]);

  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [currentLogo]);

  const IconsMap = Icons as unknown as Record<string, LucideIcon>;

  return (
    <aside
      className={cn('sidebar-container', isSidebarCollapsed && 'sidebar-collapsed')}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      <button
        className="sidebar-toggle-button"
        onClick={toggleSidebar}
        aria-label={isSidebarCollapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className="sidebar-header">
        <Link to="/" className="flex items-center justify-center">
          {currentLogo && !imageError ? (
            <img
              src={currentLogo}
              alt="Logo ZUPdeCO"
              className={cn(
                'sidebar-logo',
                isSidebarCollapsed ? 'sidebar-logo-collapsed' : 'sidebar-logo-expanded',
              )}
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center font-bold',
                isSidebarCollapsed ? 'w-10 h-10 text-lg' : 'h-10 px-4 text-xl',
                'bg-gradient-to-br from-[var(--color-2-nuance-1)] to-[var(--color-2-nuance-2)]',
                'text-white rounded-xl shadow-md',
                'border border-[var(--color-2-nuance-2)]',
              )}
            >
              {isSidebarCollapsed ? 'Z' : 'ZUPdeCO'}
            </div>
          )}
        </Link>
      </div>

      <nav className="sidebar-nav">
        {/* Ungrouped menus first */}
        {ungrouped.map((menu) => (
          <MenuItem key={menu.id} menu={menu} collapsed={isSidebarCollapsed} />
        ))}

        {/* Divider if both ungrouped and groups exist */}
        {ungrouped.length > 0 && groups.length > 0 && <div className="sidebar-divider" />}

        {/* Grouped menus */}
        {groups.map((group) => {
          const isOpen = openMenus.includes(group.groupLabel);
          const GroupIcon = IconsMap[group.groupIcon || 'Folder'] || Icons.Folder;

          return (
            <div key={group.groupLabel} className="sidebar-group">
              <button
                type="button"
                className={cn('sidebar-group-header', isOpen && 'sidebar-group-header-open')}
                onClick={() => toggleGroup(group.groupLabel)}
              >
                <GroupIcon className="sidebar-group-icon" size={20} />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left font-semibold">{group.groupLabel}</span>
                    <Icons.ChevronDown
                      className={cn(
                        'sidebar-group-chevron',
                        isOpen && 'sidebar-group-chevron-open',
                      )}
                      size={18}
                    />
                  </>
                )}
              </button>

              {!isSidebarCollapsed && isOpen && (
                <div className="sidebar-group-items">
                  {group.items.map((item) => (
                    <MenuItem key={item.id} menu={item} collapsed={false} isInGroup={true} />
                  ))}
                </div>
              )}

              {isSidebarCollapsed && isOpen && (
                <div className="sidebar-group-items">
                  {group.items.map((item) => (
                    <MenuItem key={item.id} menu={item} collapsed={true} isInGroup={true} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {ungrouped.length === 0 && groups.length === 0 && (
          <div className={cn('px-4 py-2 text-center', 'text-muted-foreground text-sm')}>
            {isSidebarCollapsed ? '' : 'Aucun menu'}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        {/* Footer menu items (Calendrier, Classement, Tutoriels) */}
        {footerItems.map((menu) => (
          <MenuItem key={menu.id} menu={menu} collapsed={isSidebarCollapsed} />
        ))}

        {/* Footer actions (Theme toggle) */}
        <ThemeToggle collapsed={isSidebarCollapsed} />
      </div>
    </aside>
  );
};
