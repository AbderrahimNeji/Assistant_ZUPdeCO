import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import { Spinner } from '@/components/ui/spinner';

interface RbacLoaderProps {
  children: React.ReactNode;
}

/**
 * RbacLoader ensures all RBAC-critical data is loaded before rendering children.
 * This prevents the "amateur effect" where sidebar is empty and pages show before permissions load.
 *
 * Waits for:
 * - User authentication state
 * - User preferences (for customizations)
 * - Critical interface elements (sidebar + dashboard) loaded at login
 */
export const RbacLoader: React.FC<RbacLoaderProps> = ({ children }) => {
  const { isAuthenticated, roles } = useAuthStore();
  const { isLoaded: arePreferencesLoaded } = usePreferencesStore();
  const interfaceStore = useInterfaceElementsStore();

  // Avec lazy loading, on vérifie uniquement que sidebar et dashboard sont chargés
  const areCriticalElementsLoaded =
    interfaceStore.isInterfaceLoaded('sidebar') && interfaceStore.isInterfaceLoaded('dashboard');

  const isLoading = !arePreferencesLoaded || !areCriticalElementsLoaded;
  const hasRoles = roles && roles.length > 0;

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (!hasRoles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner variant="default" size="xl" label="Chargement des rôles..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner variant="default" size="xl" label="Chargement de l'interface..." />
      </div>
    );
  }

  return <>{children}</>;
};
