import { initializeApp } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  RecaptchaVerifier,
  type Persistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set language to French
auth.languageCode = 'fr';

// Configure default persistence (tokens stored in localStorage, managed by Firebase SDK)
// This is called asynchronously to avoid top-level await
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting default persistence:', error);
});

/**
 * Set authentication persistence based on "remember me" preference
 * @param rememberMe - If true, uses localStorage persistence; if false, uses session persistence
 */
export const setAuthPersistence = async (rememberMe: boolean): Promise<void> => {
  const persistence: Persistence = rememberMe
    ? browserLocalPersistence // Persists across browser sessions
    : browserSessionPersistence; // Only persists during current session

  await setPersistence(auth, persistence);
};

/**
 * Initialize invisible reCAPTCHA for phone authentication
 * @param containerId - ID of the container element (default: 'recaptcha-container')
 * @returns RecaptchaVerifier instance
 */
export const initRecaptchaVerifier = (containerId = 'recaptcha-container'): RecaptchaVerifier => {
  // Clear any existing reCAPTCHA
  const existingContainer = document.getElementById(containerId);
  if (existingContainer) {
    existingContainer.innerHTML = '';
  }

  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      // Response expired, ask user to solve reCAPTCHA again
      console.warn('reCAPTCHA expired');
    },
  });
};

/**
 * Cleanup reCAPTCHA verifier
 */
export const cleanupRecaptcha = (verifier: RecaptchaVerifier | null) => {
  if (verifier) {
    try {
      verifier.clear();
    } catch (error) {
      console.error('Error clearing reCAPTCHA:', error);
    }
  }
};
