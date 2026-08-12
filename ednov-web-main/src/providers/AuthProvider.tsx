import * as React from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import { fetchUserData } from '@/services/auth.service';
import { getUserPreferences } from '@/services/preferences.service';
import { getInterfaceElements } from '@/services/interface-elements.service';
import { getInitialInterfacesToLoad } from '@/utils/dashboard-ie-utils';
import type { InterfaceAccess } from '@/types/permissions.types';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';
import { isTutorBlockedError, getTutorBlockedMessage, hasTutorRole } from '@/utils/firebase-errors';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isChecking, setIsChecking] = React.useState(true);
  const { setAuthData, logout, setBootstrapping } = useAuthStore();
  const { setPreferences } = usePreferencesStore();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Mark as bootstrapping to prevent premature API calls
          setBootstrapping(true);

          // Don't force refresh — Firebase auto-refreshes expired tokens transparently
          await firebaseUser.getIdToken();

          const storedPrefs = usePreferencesStore.getState();
          const interfaceStore = useInterfaceElementsStore.getState();
          const authStore = useAuthStore.getState();

          // Only clear interface cache on FIRST login or after intentional logout
          // (not on multi-tab sync to prevent disconnecting other tabs)
          const wasLoggedOut = !authStore.isAuthenticated;
          if (wasLoggedOut) {
            interfaceStore.clearElements();
          }

          // Always re-fetch user data (roles + permissions — never stored in localStorage)
          // Preferences: skip if already in localStorage, fetch otherwise
          const [userData, preferences] = await Promise.all([
            fetchUserData(),
            storedPrefs.isLoaded ? Promise.resolve(storedPrefs.preferences!) : getUserPreferences(),
          ]);

          const roles =
            userData.userRoles
              ?.filter((ur) => ur.role)
              .map((ur) => ({
                id: ur.role!.id,
                code: ur.role!.code,
                label: ur.role!.label,
                permissions: ur.role!.permissions || {},
              })) || [];

          if (hasTutorRole(roles)) {
            const message = getTutorBlockedMessage();
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('tutor_blocked', 'true');
              sessionStorage.setItem('tutor_blocked_message', message);
            }
            console.error('Tutor blocked (staff app):', message);

            // Mark as intentional logout
            localStorage.setItem('intentional_logout', 'true');

            await signOut(auth);
            await logout();
          } else {
            if (!storedPrefs.isLoaded) {
              setPreferences(preferences);
            }

            // Interface elements: only fetch what's missing from localStorage
            const dashboardConfig = preferences.interfaceConfigs?.['dashboard'];
            const expectedInterfaces = getInitialInterfacesToLoad(dashboardConfig);
            const missingInterfaces = expectedInterfaces.filter(
              (name) =>
                !interfaceStore.isInterfaceLoaded(name) && !interfaceStore.isInterfaceLoading(name),
            );

            if (missingInterfaces.length > 0) {
              // Mark as loading BEFORE fetching to prevent duplicate fetches from concurrent hooks
              missingInterfaces.forEach((name) => interfaceStore.startLoading(name));
              const results = await Promise.all(
                missingInterfaces.map((name) => getInterfaceElements(name)),
              );
              const loadedData: Record<string, any[]> = {};
              missingInterfaces.forEach((name, i) => {
                loadedData[name] = results[i];
              });
              interfaceStore.setInterfaceElements(loadedData);
            }

            setAuthData(
              userData,
              roles,
              (userData.interfaceAccess || {}) as Record<string, InterfaceAccess>,
            );
          }
        } catch (error) {
          // Mark as bootstrapping false on error
          setBootstrapping(false);

          // Legacy: 403 + staff-app phrase from API (if ever returned)
          const isTutorBlocked = isTutorBlockedError(error);
          if (isTutorBlocked) {
            const message = getTutorBlockedMessage();
            console.error('Tutor blocked:', message);

            // Mark as intentional logout
            localStorage.setItem('intentional_logout', 'true');

            // Sign out from Firebase to clear the session
            await signOut(auth);
          } else {
            // Token is invalid or expired, or API call failed — sign out from
            // Firebase too so the next signInWithEmailAndPassword triggers
            // a fresh onAuthStateChanged (Firebase won't re-fire if the user
            // is still considered currentUser).
            console.error('Auth restoration failed:', error);

            // Mark as intentional logout
            localStorage.setItem('intentional_logout', 'true');

            await signOut(auth);
          }
          await logout();
        }
      } else {
        // No Firebase user detected
        const authStore = useAuthStore.getState();
        const wasIntentionalLogout = localStorage.getItem('intentional_logout') === 'true';

        // Clear intentional logout flag
        localStorage.removeItem('intentional_logout');

        // Only logout if:
        // 1. We were previously authenticated AND
        // 2. This was an intentional logout OR this is the initial check
        if (authStore.isAuthenticated || wasIntentionalLogout) {
          logout();
        }

        setBootstrapping(false);
      }

      setIsChecking(false);
    });

    return () => unsubscribe();
    // Zustand actions (setAuthData, logout, setPreferences, setBootstrapping) have stable references —
    // they never change. isAuthenticated is intentionally excluded from deps:
    // including it would cause a re-subscription loop (each setAuthData call would
    // trigger a new onAuthStateChanged subscription, duplicating all API calls).
  }, []);

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-full bg-background">
        <Spinner variant="default" size="xl" label="Vérification de la session..." />
      </div>
    );
  }

  return <>{children}</>;
};
