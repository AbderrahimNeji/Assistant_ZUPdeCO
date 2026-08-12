import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmationResult } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import {
  loginWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendPasswordResetEmail,
} from '@/services/auth.service';
import { auth, initRecaptchaVerifier, setAuthPersistence } from '@/config/firebase';
import {
  handleFirebaseError,
  isTutorBlockedError,
  getTutorBlockedMessage,
  consumeTutorBlockedSessionMessage,
  pickNestMessage,
} from '@/utils/firebase-errors';
import { detectIdentifierType, formatPhoneNumber } from '@/utils/validation';
import type { IdentifierType } from '@/utils/validation';
import { toast } from '@/lib/toast';

export type LoginMode = 'initial' | 'email' | 'phone';

interface UseLoginReturn {
  mode: LoginMode;
  identifier: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | undefined;

  setIdentifier: (_value: string) => void;
  setPassword: (_value: string) => void;
  setRememberMe: (_value: boolean) => void;

  handleIdentifierChange: (_value: string) => void;
  switchToPhone: (_phoneNumber: string) => void;
  handleEmailLogin: () => Promise<void>;
  handleSendOtp: () => Promise<ConfirmationResult>;
  handleVerifyOtp: (_confirmationResult: ConfirmationResult, _code: string) => Promise<void>;
  handleResetPassword: (_email: string) => Promise<void>;

  clearError: () => void;
}

const TUTOR_BLOCKED_BOOTSTRAP_ERROR = '__TUTOR_BLOCKED_BOOTSTRAP__';

/**
 * Waits for AuthProvider to finish bootstrapping auth (fetchUserData, preferences,
 * interface elements). Resolves as soon as isAuthenticated becomes true in the store.
 * Rejects early when api-client flags tutor 403 (sessionStorage) so login can show API message.
 */
const waitForAuthBootstrap = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (useAuthStore.getState().isAuthenticated) {
      resolve();
      return;
    }

    // Synchronous check — AuthProvider may have set the flag before the poll starts.
    if (sessionStorage.getItem('tutor_blocked') === 'true') {
      reject(new Error(TUTOR_BLOCKED_BOOTSTRAP_ERROR));
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      clearInterval(poll);
      unsub();
    };

    const poll = setInterval(() => {
      if (sessionStorage.getItem('tutor_blocked') === 'true') {
        finish();
        reject(new Error(TUTOR_BLOCKED_BOOTSTRAP_ERROR));
      }
    }, 100);

    const timeout = setTimeout(() => {
      finish();
      reject(new Error("Délai d'authentification dépassé, veuillez réessayer."));
    }, 10000);

    const unsub = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated) {
        finish();
        resolve();
      }
    });
  });
};

async function resolveTutorBlockedToastMessage(err: unknown): Promise<string | null> {
  const fromSession = consumeTutorBlockedSessionMessage();
  if (fromSession !== null) return fromSession;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: string }).message;
    if (msg === TUTOR_BLOCKED_BOOTSTRAP_ERROR) {
      return getTutorBlockedMessage();
    }
  }
  if (isTutorBlockedError(err)) {
    const api = pickNestMessage((err as { response?: { data?: unknown } }).response?.data);
    return api && api.length > 0 ? api : getTutorBlockedMessage();
  }
  return null;
}

export const useLogin = (): UseLoginReturn => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<LoginMode>('initial');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const clearError = () => setError(undefined);

  // Bascule directement en mode phone sans passer par detectIdentifierType
  const switchToPhone = (phoneNumber: string) => {
    setIdentifier(phoneNumber);
    setError(undefined);
    setMode('phone');
  };

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    setError(undefined);

    const type: IdentifierType = detectIdentifierType(value);

    if (type === 'email') {
      setMode('email');
    } else if (type === 'phone') {
      setMode('phone');
    } else {
      setMode('initial');
    }
  };

  const handleEmailLogin = async () => {
    setIsLoading(true);
    setError(undefined);
    setIsSuccess(false);

    try {
      await setAuthPersistence(rememberMe);

      await loginWithEmail(identifier, password);
      // No getIdToken(true) here — token is brand new after loginWithEmail,
      // and AuthProvider.onAuthStateChanged will call getIdToken(true) once.

      // AuthProvider.onAuthStateChanged handles ALL data loading (fetchUserData,
      // getUserPreferences, getInterfaceElements). We wait for it to finish.
      await waitForAuthBootstrap();

      // Clear React Query cache to force fresh data with new role permissions
      queryClient.clear();

      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate('/dashboard');
    } catch (err) {
      const tutorMessage = await resolveTutorBlockedToastMessage(err);
      if (tutorMessage !== null) {
        try {
          await signOut(auth);
        } catch {
          /* ignore */
        }
        setError(tutorMessage);
        toast.error(tutorMessage);
      } else {
        const errorMessage = handleFirebaseError(err);
        setError(errorMessage);
        toast.error(errorMessage);
        // Ensure Firebase session is cleared so the next login attempt
        // triggers a fresh onAuthStateChanged in AuthProvider.
        try {
          await signOut(auth);
        } catch {
          /* ignore */
        }
      }
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (): Promise<ConfirmationResult> => {
    setIsLoading(true);
    setError(undefined);

    try {
      await setAuthPersistence(rememberMe);

      const formattedPhone = formatPhoneNumber(identifier);

      const recaptchaVerifier = initRecaptchaVerifier();

      const confirmationResult = await sendPhoneOtp(formattedPhone, recaptchaVerifier);
      toast.success('Code OTP envoyé');

      return confirmationResult;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (
    confirmationResult: ConfirmationResult,
    code: string,
  ): Promise<void> => {
    setIsLoading(true);
    setError(undefined);
    setIsSuccess(false);

    try {
      await verifyPhoneOtp(confirmationResult, code);

      // AuthProvider.onAuthStateChanged handles ALL data loading (fetchUserData,
      // getUserPreferences, getInterfaceElements). We wait for it to finish.
      await waitForAuthBootstrap();

      // Clear React Query cache to force fresh data with new role permissions
      queryClient.clear();

      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate('/dashboard');
    } catch (err) {
      const tutorMessage = await resolveTutorBlockedToastMessage(err);
      if (tutorMessage !== null) {
        try {
          await signOut(auth);
        } catch {
          /* ignore */
        }
        setError(tutorMessage);
        toast.error(tutorMessage);
      } else {
        const errorMessage = handleFirebaseError(err);
        setError(errorMessage);
        toast.error(errorMessage);
        // Ensure Firebase session is cleared so the next login attempt
        // triggers a fresh onAuthStateChanged in AuthProvider.
        try {
          await signOut(auth);
        } catch {
          /* ignore */
        }
      }
      setIsSuccess(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(undefined);

    try {
      await sendPasswordResetEmail(email);
      toast.success('Email de réinitialisation envoyé');
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mode,
    identifier,
    password,
    rememberMe,
    isLoading,
    isSuccess,
    error,

    setIdentifier,
    setPassword,
    setRememberMe,

    handleIdentifierChange,
    switchToPhone,
    handleEmailLogin,
    handleSendOtp,
    handleVerifyOtp,
    handleResetPassword,

    clearError,
  };
};
