import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { InterfaceElement } from '@/types/interface-elements.types';
import { cn } from '@/lib/utils';
import {
  isSidebarRouteActive,
  resolveSidebarRoutePath,
} from '@/constants/sidebar-routes';

interface MenuItemProps {
  menu: InterfaceElement;
  collapsed: boolean;
  isInGroup?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({ menu, collapsed, isInGroup = false }) => {
  const location = useLocation();

  const routePath = resolveSidebarRoutePath(menu);
  const isActive = isSidebarRouteActive(location.pathname, routePath);

  const iconName = menu.config?.iconName as string;
  const IconsMap = Icons as unknown as Record<string, LucideIcon>;
  const Icon = IconsMap[iconName] || Icons.Circle;

  if (!routePath) {
    return null;
  }

  const menuContent = (
    <Link
      to={routePath}
      className={cn('menu-item', isActive && 'menu-item-active', isInGroup && 'menu-item-in-group')}
    >
      <Icon className="menu-item-icon" size={20} />
      {!collapsed && <span className="flex-1 text-left">{menu.elementLabel}</span>}
    </Link>
  );

  return collapsed ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{menuContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="font-medium">{menu.elementLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    menuContent
  );
};
