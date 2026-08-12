import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: { resource: string; action?: string };
  requireAuth?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Guards routes by checking isAuthenticated and loading interface_elements.
 *
 * The legacy permissions system has been removed. Access is now controlled exclusively
 * through the interface_elements table. This component loads the required interface
 * and grants access if the user has at least one element for that interface.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requireAuth = true,
  fallback,
  redirectTo = '/login',
}) => {
  const { isAuthenticated } = useAuth();
  const interfaceName = requiredPermission?.resource;
  const { elements, isLoading } = useInterfaceElements(interfaceName || '');

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredPermission && interfaceName) {
    if (isLoading) {
      return <div className="flex items-center justify-center min-h-full">Chargement...</div>;
    }

    const hasAccess = elements.length > 0;
    if (!hasAccess) {
      return fallback ? <>{fallback}</> : <Navigate to="/dashboard/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
