import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/stores/layoutStore';
import { UserMenu } from './UserMenu';
import { NotificationsBell } from './NotificationsBell';
import { ModeSwitchButton } from './ModeSwitchButton';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { GlobalSearchInput } from '@/components/search/GlobalSearchInput';
import { Menu } from 'lucide-react';
import { Button } from '@/components/forms/Button';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { navbarHeight, toggleSidebar, isSidebarCollapsed } = useLayoutStore();

  const pageTitle = React.useMemo(() => {
    const titleMap: Record<string, string> = {
      '/': 'Dashboard',
      '/post-its': 'Post-its',
      '/calendar': 'Calendrier',
      '/sessions': 'Gestion des Séances',
      '/sessions/mine': 'Mes Séances',
      '/users': 'Utilisateurs',
      '/settings': 'Paramètres',
      '/profile': 'Mon Profil',
      '/components': 'Composants',
    };

    return titleMap[location.pathname] || 'Mode présentiel';
  }, [location.pathname]);

  return (
    <header
      className="navbar-container"
      style={{ '--navbar-height': `${navbarHeight}px` } as React.CSSProperties}
    >
      <div className="navbar-content">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="navbar-icon-button lg:hidden"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
            icon={Menu}
          />

          <h1 className="navbar-title">{pageTitle}</h1>
        </div>

        <GlobalSearchProvider>
          <GlobalSearchInput />
        </GlobalSearchProvider>

        <div className="navbar-actions">
          <ModeSwitchButton />

          <NotificationsBell />

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
