import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  signInWithEmailLink,
  updatePassword,
  ConfirmationResult,
  isSignInWithEmailLink,
} from 'firebase/auth';
import { auth, initRecaptchaVerifier, cleanupRecaptcha } from '@/config/firebase';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  activateAccount as apiActivateAccount,
} from '@/services/auth.service';
import { handleFirebaseError } from '@/utils/firebase-errors';
import { formatPhoneNumber, validatePassword } from '@/utils/validation';
import { toast } from '@/lib/toast';

export const useInvitationSetup = () => {
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const phone = searchParams.get('phone');
  const emailParam = searchParams.get('email'); // Email depuis l'URL si fourni
  const roleParam = searchParams.get('role'); // Role depuis l'URL (tutor, etc.)
  const roleGroupParam = searchParams.get('roleGroup'); // Groupe de rôle (tutors, etc.)
  const token = searchParams.get('token'); // Jeton d'activation (mode=activate)

  // Firebase génère automatiquement mode=signIn pour les liens d'email
  // On accepte aussi mode=setup pour rétrocompatibilité ; mode=activate = nouveau flux (JWT 14j)
  const isSetupMode =
    mode === 'setup' || mode === 'signIn' || mode === 'phone-setup' || mode === 'activate';
  const isEmailSetup = (mode === 'setup' || mode === 'signIn') && !!oobCode;
  const isPhoneSetup = mode === 'phone-setup' && !!phone;
  const isActivateSetup = mode === 'activate' && !!token;

  // Les tuteurs sont redirigés vers l'app mobile après activation (role OU roleGroup).
  const isTutorInvite = roleParam === 'tutor' || roleGroupParam === 'tutors';

  const redirectAfterSetup = () => {
    if (isTutorInvite) {
      const tutorAppUrl =
        import.meta.env.VITE_TUTOR_APP_URL || 'https://zupdeco-mobile-v2.web.app/';
      globalThis.location.href = tutorAppUrl;
    } else {
      globalThis.location.href = '/login';
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [invitationEmail, setInvitationEmail] = useState<string | null>(emailParam);

  // Essayer de récupérer l'email depuis localStorage si l'utilisateur a cliqué sur le lien
  useEffect(() => {
    if (isEmailSetup) {
      // Priorité 1: email depuis l'URL
      if (emailParam) {
        setInvitationEmail(emailParam);
        return;
      }

      // Priorité 2: email depuis localStorage (si Firebase a stocké l'email)
      if (isSignInWithEmailLink(auth, globalThis.location.href)) {
        const storedEmail = globalThis.localStorage.getItem('emailForSignIn');
        if (storedEmail) {
          setInvitationEmail(storedEmail);
        }
      }
    }
  }, [isEmailSetup, emailParam]);

  /**
   * Setup password for email invitation
   */
  const setupPassword = async (
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<void> => {
    setError(undefined);

    // Validation
    if (password !== confirmPassword) {
      const errorMsg = 'Les mots de passe ne correspondent pas';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const invalidRules = passwordValidation.rules
        .filter((rule) => !rule.valid)
        .map((rule) => rule.label);
      const errorMsg = `Le mot de passe ne respecte pas les critères suivants : ${invalidRules.join(', ')}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);

    try {
      // Sign in with email link
      const userCredential = await signInWithEmailLink(auth, email, globalThis.location.href);

      // Récupérer l'email de l'utilisateur depuis Firebase et l'afficher dans le champ
      const userEmail = userCredential.user.email;
      if (userEmail) {
        setInvitationEmail(userEmail);
      }

      // Update password
      if (userCredential.user) {
        await updatePassword(userCredential.user, password);
      }

      // Sign out l'utilisateur pour qu'il se reconnecte avec son nouveau mot de passe
      await auth.signOut();

      // Nettoyer le localStorage
      globalThis.localStorage.removeItem('emailForSignIn');

      toast.success('Votre compte a été activé ! Vous pouvez maintenant vous connecter.');

      // Wait 2 seconds then redirect (tutors → mobile app, others → web login)
      setTimeout(redirectAfterSetup, 2000);
    } catch (err) {
      const errorMsg = handleFirebaseError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Activate account from an email invitation token (mode=activate). Sets the password via the
   * backend, then redirects. The link is valid 14 days; expired/invalid tokens surface a clear
   * message from the API.
   */
  const activateAccount = async (password: string, confirmPassword: string): Promise<void> => {
    setError(undefined);

    if (password !== confirmPassword) {
      const errorMsg = 'Les mots de passe ne correspondent pas';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const invalidRules = passwordValidation.rules
        .filter((rule) => !rule.valid)
        .map((rule) => rule.label);
      const errorMsg = `Le mot de passe ne respecte pas les critères suivants : ${invalidRules.join(', ')}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!token) {
      const errorMsg = "Lien d'activation invalide.";
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);

    try {
      await apiActivateAccount(token, password);
      toast.success('Votre compte a été activé ! Vous pouvez maintenant vous connecter.');
      setTimeout(redirectAfterSetup, 2000);
    } catch (err) {
      const errorMsg = handleFirebaseError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify phone OTP for phone invitation
   */
  const verifyPhoneSetup = async (
    confirmationResult: ConfirmationResult,
    code: string,
  ): Promise<void> => {
    setError(undefined);
    setIsLoading(true);

    try {
      await verifyPhoneOtp(confirmationResult, code);

      toast.success('Votre compte a été activé ! Redirection vers le login...');

      // Wait 2 seconds then redirect (tutors → mobile app, others → web login)
      globalThis.setTimeout(redirectAfterSetup, 2000);
    } catch (err) {
      const errorMsg = handleFirebaseError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send OTP for phone setup
   */
  const sendPhoneSetupOtp = async (phoneNumber: string): Promise<ConfirmationResult> => {
    setError(undefined);
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const verifier = initRecaptchaVerifier();
      const confirmationResult = await sendPhoneOtp(formattedPhone, verifier);

      return confirmationResult;
    } catch (err) {
      const errorMsg = handleFirebaseError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cleanup reCAPTCHA on unmount
   */
  const cleanup = (verifier: any) => {
    cleanupRecaptcha(verifier);
  };

  return {
    isSetupMode,
    isEmailSetup,
    isPhoneSetup,
    isActivateSetup,
    oobCode,
    phone,
    invitationEmail,
    isLoading,
    error,
    setupPassword,
    activateAccount,
    verifyPhoneSetup,
    sendPhoneSetupOtp,
    cleanup,
  };
};
