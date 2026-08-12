import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? (process.env as Record<string, string | undefined>);

function readUseStaticData(): boolean {
  const raw =
    extra.EXPO_PUBLIC_USE_STATIC_DATA ?? process.env.EXPO_PUBLIC_USE_STATIC_DATA ?? '';
  return raw === 'true' || raw === '1';
}

function readShowAssignmentCandidates(): boolean {
  const raw =
    extra.EXPO_PUBLIC_SHOW_ASSIGNMENT_CANDIDATES ?? process.env.EXPO_PUBLIC_SHOW_ASSIGNMENT_CANDIDATES ?? '';
  return raw === 'true' || raw === '1';
}

/**
 * On a real phone or many simulators, `localhost` is the device itself, not your dev PC.
 * Replace with EXPO_PUBLIC_DEV_HOST (your PC LAN IP, e.g. 192.168.1.10).
 * Android emulator: use 10.0.2.2. iOS Simulator can use localhost, but DEV_HOST still works if set.
 */
function readApiUrl(): string {
  let raw = (extra.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  const isNativeMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  if (raw && raw.includes('localhost') && isNativeMobile) {
    const devHost = extra.EXPO_PUBLIC_DEV_HOST ?? process.env.EXPO_PUBLIC_DEV_HOST ?? '';
    if (devHost) {
      const url = raw.replace(/localhost/g, devHost.trim());
      if (__DEV__) {
        console.log(`[env] ${Platform.OS}: replaced localhost with DEV_HOST, apiUrl:`, url);
      }
      return url;
    }
    if (__DEV__) {
      console.warn(
        '[env] EXPO_PUBLIC_API_URL contains localhost — on iOS/Android device the API will not be reachable. Set EXPO_PUBLIC_DEV_HOST in .env to your PC IP (same Wi‑Fi), e.g. 192.168.1.10 (Android emulator: 10.0.2.2), then restart Expo.'
      );
    }
  }

  /**
   * Expo Web: a relative API base (e.g. /api/v1) is resolved against the Metro dev server origin,
   * not Nest — uploads then fail with Express 404 "Cannot POST /api/v1/users/...".
   * Prefix with EXPO_PUBLIC_WEB_API_ORIGIN, or in __DEV__ default to http://localhost:3000.
   */
  if (raw.startsWith('/') && Platform.OS === 'web') {
    const webOrigin = (
      extra.EXPO_PUBLIC_WEB_API_ORIGIN ??
      process.env.EXPO_PUBLIC_WEB_API_ORIGIN ??
      ''
    ).trim();
    const fallbackDev = __DEV__ ? 'http://localhost:3000' : '';
    const origin = webOrigin || fallbackDev;
    if (origin) {
      raw = `${origin.replace(/\/$/, '')}${raw}`;
      if (__DEV__) {
        console.log('[env] Web: resolved relative EXPO_PUBLIC_API_URL to', raw);
      }
    } else {
      console.warn(
        '[env] Production web: EXPO_PUBLIC_API_URL is relative (e.g. /api/v1) but EXPO_PUBLIC_WEB_API_ORIGIN is unset. ' +
          'The browser will POST to your static host (Firebase), not Nest — you will get 404 "Cannot POST /api/v1/...". ' +
          'Fix: before `expo export` / deploy:web, set EXPO_PUBLIC_WEB_API_ORIGIN=https://<nest-host> or use a full EXPO_PUBLIC_API_URL.',
      );
    }
  }

  return raw;
}

export const env = {
  /** When true, ignore API and use static/mock data everywhere (for UI testing without seeded DB). */
  useStaticData: readUseStaticData(),
  /** When true, show "Candidats à l'assignation" section on session detail (GET /sessions/:id/assignment-candidates). Default false. */
  showAssignmentCandidates: readShowAssignmentCandidates(),
  apiUrl: readApiUrl(),
  firebase: {
    apiKey: extra.EXPO_PUBLIC_FIREBASE_API_KEY ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: extra.EXPO_PUBLIC_FIREBASE_APP_ID ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
} as const;

/**
 * Explains common web 404s when the bundle was built with the wrong API base (Firebase vs Nest).
 */
export function getWebApiMisconfigurationHint(): string | null {
  if (Platform.OS !== 'web') return null;
  const u = env.apiUrl;
  if (!u.trim()) {
    return 'EXPO_PUBLIC_API_URL est vide : configurez l’URL du backend Nest.';
  }
  if (u.startsWith('/')) {
    return (
      'L’API est configurée en chemin relatif (' +
      u +
      ') : sur le web, les requêtes partent vers l’hôte de la page (ex. Firebase), pas vers Nest. ' +
      'Définissez EXPO_PUBLIC_WEB_API_ORIGIN ou une EXPO_PUBLIC_API_URL complète avant le build (`npm run deploy:web`).'
    );
  }
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { location?: { hostname?: string } }).location?.hostname === 'string') {
    const h = (globalThis as { location: { hostname: string } }).location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1' && /\blocalhost\b|127\.0\.0\.1/.test(u)) {
      return (
        'EXPO_PUBLIC_API_URL pointe vers localhost alors que le site est servi depuis « ' +
        h +
        ' ». Rebuild avec l’URL publique du backend (ex. https://votre-app.ondigitalocean.app/api/v1).'
      );
    }
  }
  return null;
}
