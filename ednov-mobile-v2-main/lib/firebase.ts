import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAuth, type Auth } from 'firebase/auth';

import { env } from '@/config/env';

// Single app/auth instance so Firebase only initializes once. The Auth SDK may call
// getProjectConfig (identitytoolkit) on first use or when checking auth state; that is expected.
let app: FirebaseApp;
let auth: Auth;

function getOrInitAuth(firebaseApp: FirebaseApp): Auth {
  if (Platform.OS === 'web') return getAuth(firebaseApp);
  try {
    const rnAuth = require('firebase/auth') as {
      initializeAuth?: (app: FirebaseApp, deps?: { persistence?: unknown }) => Auth;
      getReactNativePersistence?: (storage: unknown) => unknown;
    };
    if (rnAuth.initializeAuth && rnAuth.getReactNativePersistence) {
      return rnAuth.initializeAuth(firebaseApp, {
        persistence: rnAuth.getReactNativePersistence(AsyncStorage),
      });
    }
    return getAuth(firebaseApp);
  } catch {
    // Auth may already be initialized in hot-reload or re-import scenarios.
    return getAuth(firebaseApp);
  }
}

if (getApps().length === 0) {
  app = initializeApp({
    apiKey: env.firebase.apiKey,
    authDomain: env.firebase.authDomain,
    projectId: env.firebase.projectId,
    storageBucket: env.firebase.storageBucket,
    messagingSenderId: env.firebase.messagingSenderId,
    appId: env.firebase.appId,
  });
  auth = getOrInitAuth(app);
} else {
  app = getApp();
  auth = getOrInitAuth(app);
}

export { app, auth };
