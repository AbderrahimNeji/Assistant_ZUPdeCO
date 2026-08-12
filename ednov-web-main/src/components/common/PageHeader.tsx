import * as React from 'react';
import { useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import {
  isSidebarRouteActive,
  resolveSidebarRoutePath,
} from '@/constants/sidebar-routes';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, contentRef }) => {
  const location = useLocation();
  const { elements: sidebarElements } = useInterfaceElements('sidebar');

  // Find the menu item that matches the current route
  const menuItem = React.useMemo(() => {
    if (!sidebarElements) return null;
    return sidebarElements.find((el) => {
      const routePath = resolveSidebarRoutePath(el);
      return isSidebarRouteActive(location.pathname, routePath);
    });
  }, [sidebarElements, location.pathname]);

  // Get icon dynamically from Lucide
  const iconName = menuItem?.config?.iconName as string | undefined;
  const IconsMap = Icons as unknown as Record<string, LucideIcon>;
  const Icon = iconName ? IconsMap[iconName] || Icons.Circle : Icons.Circle;

  return (
    <div className="management-page-header" ref={contentRef}>
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center border-2"
          style={{
            background: 'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
            borderColor: 'var(--color-2-nuance-1)',
          }}
        >
          <Icon className="w-6 h-6" style={{ color: 'var(--color-2-nuance-1)' }} />
        </div>
        <div>
          <h1 className="management-page-title">{title}</h1>
          {subtitle && <p className="management-page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="management-page-actions">{actions}</div>}
    </div>
  );
};
