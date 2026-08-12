import '../global.css';

import NetInfo from '@react-native-community/netinfo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AppState, type AppStateStatus, Platform } from 'react-native';

// Keep TanStack Query in sync with the device network state so queries are
// properly paused (not failing) when the app is offline.
// Aligns with useNetworkStatus: treats isInternetReachable=false as offline (captive portals),
// and fetches the initial state immediately so we don't start with a stale "online" assumption.
onlineManager.setEventListener((setOnline) => {
  const toOnline = (state: import('@react-native-community/netinfo').NetInfoState) =>
    !(
      state.isConnected === false ||
      (state.isInternetReachable === false && state.isConnected !== null)
    );
  NetInfo.fetch().then((state) => setOnline(toOnline(state)));
  return NetInfo.addEventListener((state) => setOnline(toOnline(state)));
});

// Wire AppState to TanStack Query's focusManager so queries with
// `refetchOnWindowFocus: true` refetch when the app comes back to the foreground.
// Required on React Native because `window.focus` events don't exist.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (Platform.OS !== 'web') handleFocus(status === 'active');
  });
  return () => subscription.remove();
});
import { useFonts } from 'expo-font';
import { useSegments, useRouter, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { registerBackgroundSync } from '@/tasks/backgroundSync';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import 'react-native-reanimated';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { env } from '@/config/env';
import { useLoginProfile } from '@/hooks/useProfile';
import { usePrefetchCrDetails } from '@/hooks/usePrefetchCrDetails';
import { asyncStoragePersister, queryClient, shouldPersistQuery } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { BrandingProvider, useBrandingReady, useDynamicColors } from '@/providers/BrandingProvider';
import { ThemeProvider as ColorSchemeProvider } from '@/providers/ThemeContext';
import { useCompanyStore } from '@/store/companyStore';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

function usePaperTheme(): MD3Theme {
  const colorScheme = useColorScheme() ?? 'light';
  const c = useDynamicColors();
  const base = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.tint,
      onPrimary: colorScheme === 'dark' ? '#000' : '#fff',
      background: c.background,
      surface: c.background,
      surfaceVariant: c.backgroundSecondary,
      onSurface: c.text,
      onSurfaceVariant: c.textSecondary,
      outline: c.border,
      error: c.danger ?? base.colors.error,
      onError: '#fff',
    },
  };
}

/** When true, backend (GET /users/login) + branding (GET /branding/complete) are required before dashboard. No exception for useStaticData so the dynamic theme is always applied before first paint. */
const requiresBackendAndBranding = () => !!env.apiUrl;

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = useDynamicColors();
  const { user, loading, signOut } = useAuth();
  const companyId = useCompanyStore((s) => s.companyId);
  const hasRehydrated = useCompanyStore((s) => s._hasRehydrated);
  const setCompanyId = useCompanyStore((s) => s.setCompanyId);
  const brandingReady = useBrandingReady();
  const segments = useSegments();
  const router = useRouter();
  const paperTheme = usePaperTheme();
  const [profileFetchNetworkError, setProfileFetchNetworkError] = useState(false);
  usePrefetchCrDetails();

  // Always run when signed in so a company re-assignment by an admin is picked up without re-login.
  const loginProfileEnabled = !!(user && hasRehydrated && env.apiUrl);
  const loginProfileQuery = useLoginProfile(loginProfileEnabled);

  // loginProfile.fetchStatus === 'paused' means we're offline and the query can't run yet —
  // treat it like a network error so the app opens with the static fallback instead of blocking forever.
  const loginProfileOfflinePaused = loginProfileEnabled && loginProfileQuery.fetchStatus === 'paused';
  const backendAndBrandingReady =
    !requiresBackendAndBranding() ||
    (hasRehydrated && (
      (companyId != null && companyId !== '' && brandingReady) ||
      profileFetchNetworkError ||
      loginProfileOfflinePaused
    ));

  useEffect(() => {
    if (!__DEV__ || !user) return;
    console.log('[RootLayout] Login gate', {
      hasUser: true,
      companyId: companyId ?? '(null)',
      hasRehydrated,
      apiUrl: env.apiUrl ? 'set' : '(empty)',
      loginProfileEnabled,
      backendAndBrandingReady,
      brandingReady,
      loginProfileStatus: loginProfileQuery.status,
      loginProfileFetchStatus: loginProfileQuery.fetchStatus,
    });
  }, [user, companyId, hasRehydrated, loginProfileEnabled, backendAndBrandingReady, brandingReady, loginProfileQuery.status, loginProfileQuery.fetchStatus]);

  useEffect(() => {
    if (!loginProfileQuery.isSuccess || !loginProfileQuery.data) return;
    const incoming = loginProfileQuery.data.companyId ?? null;
    // Only update + invalidate when the companyId actually changes to avoid unnecessary refetches.
    if (incoming === companyId) return;
    setCompanyId(incoming);
    queryClient.invalidateQueries({ queryKey: ['students'] });
    if (__DEV__) console.log('[Branding] companyId updated from profile:', incoming ?? '(null)');
  }, [loginProfileQuery.isSuccess, loginProfileQuery.data, companyId, setCompanyId]);

  useEffect(() => {
    if (!loginProfileQuery.isError || !loginProfileQuery.error) return;
    const err = loginProfileQuery.error as { status?: number; message?: string; name?: string };
    const status = err?.status ?? 0;
    const message = err?.message ?? '';
    const isNetworkError =
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      /Network Error|Failed to fetch|fetch failed/i.test(message);
    if (status === 401 || status === 404) {
      signOut();
    } else if (status === 0 && isNetworkError) {
      if (__DEV__) console.log('[Branding] Profile fetch failed (network unreachable), using fallback theme');
      setProfileFetchNetworkError(true);
    } else if (status === 0) {
      if (__DEV__) console.log('[Branding] Profile fetch failed (unknown/backend), companyId not set');
    } else if (__DEV__) {
      console.log('[Branding] Profile fetch failed, companyId not set:', status);
    }
  }, [loginProfileQuery.isError, loginProfileQuery.error, signOut]);

  useEffect(() => {
    if (!user) setProfileFetchNetworkError(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as never);
      return;
    }
    // Same gate on login and on refresh/reload: never show dashboard until backend + branding ready (avoids fallback theme flash in exported app).
    if (user && requiresBackendAndBranding() && !backendAndBrandingReady && !inAuthGroup) {
      router.replace('/(auth)/login' as never);
      return;
    }
    // Let user complete set-new-password after OTP reset; do not redirect to tabs until they are done.
    const isSetNewPasswordScreen = (segments as string[]).includes('set-new-password');
    if (user && inAuthGroup && backendAndBrandingReady && !isSetNewPasswordScreen) {
      router.replace('/(tabs)' as never);
    }
  }, [user, loading, segments, router, backendAndBrandingReady, profileFetchNetworkError]);

  if (loading) {
    return <LoadingScreen />;
  }

  // Login and refresh/reload: same gate — never show dashboard until GET /users/login + GET /branding/complete are done (prevents fallback theme flash in exported app).
  if (user && requiresBackendAndBranding() && !backendAndBrandingReady) {
    return <LoadingScreen message="Connexion et chargement du thème…" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <PaperProvider theme={paperTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' } as object} />
          </Stack>
        </PaperProvider>
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days — support extended offline use
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
      onSuccess={() => {
        registerBackgroundSync();
      }}
    >
      <AuthProvider>
        <ColorSchemeProvider>
          <BrandingProvider>
            <SafeAreaProvider>
              <RootLayoutNav />
            </SafeAreaProvider>
          </BrandingProvider>
        </ColorSchemeProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
