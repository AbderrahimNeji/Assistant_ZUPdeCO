import axios from 'axios';

/**
 * Firebase error code translations to French
 */

/** Nest / Axios JSON body: `message` string or string[]. */
export function pickNestMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = (data as { message?: unknown }).message;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) return raw[0].trim();
  return undefined;
}

/** Phrase for tutor denied access to the staff app (403 body or frontend copy). */
export const TUTOR_APP_ACCESS_DENIED_PHRASE =
  "Vous n'êtes pas autorisé à accéder à cette application";

export function isTutorPlatformAccessDeniedMessage(text: string): boolean {
  return text.includes(TUTOR_APP_ACCESS_DENIED_PHRASE);
}

/** Staff web app: block if any assigned role is tutor (same rule as former AuthService check). */
export function hasTutorRole(roles: { code: string }[]): boolean {
  return roles.some((r) => r.code === 'tutor');
}

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };

    // Firebase network errors
    if (err.code === 'auth/network-request-failed' || err.code === 'auth/timeout') {
      return true;
    }

    // Generic network errors
    if (
      err.message &&
      (err.message.includes('network') ||
        err.message.includes('offline') ||
        err.message.includes('timeout') ||
        err.message.includes('Failed to fetch'))
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Tutor denied access to the staff app: **403** + AuthService message only.
 * Does not match 401 / invalid token / other forbidden responses.
 */
export const isTutorBlockedError = (error: unknown): boolean => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { status?: number; data?: unknown } };
    if (err.response?.status !== 403) return false;
    const message = pickNestMessage(err.response?.data) ?? '';
    return isTutorPlatformAccessDeniedMessage(message);
  }
  return false;
};

/**
 * Get tutor blocked error message
 */
export const getTutorBlockedMessage = (): string => {
  return `${TUTOR_APP_ACCESS_DENIED_PHRASE}.`;
};

/** Clears tutor-block flags set by api-client; returns API message or fallback. */
export const consumeTutorBlockedSessionMessage = (): string | null => {
  if (typeof sessionStorage === 'undefined') return null;
  if (sessionStorage.getItem('tutor_blocked') !== 'true') return null;
  const apiMessage = sessionStorage.getItem('tutor_blocked_message');
  sessionStorage.removeItem('tutor_blocked');
  sessionStorage.removeItem('tutor_blocked_message');
  const trimmed = apiMessage?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : getTutorBlockedMessage();
};

export const getFirebaseErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    // Authentication errors
    'auth/user-not-found': 'Aucun compte trouvé avec cet identifiant',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-email': 'Adresse email invalide',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',

    // Phone authentication errors
    'auth/invalid-phone-number': 'Numéro de téléphone invalide',
    'auth/invalid-verification-code': 'Code OTP incorrect',
    'auth/invalid-verification-id': 'Session de vérification invalide',
    'auth/code-expired': 'Le code OTP a expiré',
    'auth/missing-phone-number': 'Veuillez saisir un numéro de téléphone',
    'auth/quota-exceeded': 'Quota de SMS dépassé, réessayez plus tard',

    // Rate limiting
    'auth/too-many-requests': 'Trop de tentatives, veuillez réessayer plus tard',
    'auth/operation-not-allowed': "Cette opération n'est pas autorisée",

    // Network errors
    'auth/network-request-failed': 'Erreur de connexion, vérifiez votre réseau',
    'auth/timeout': 'La requête a expiré, veuillez réessayer',

    // Password reset errors
    'auth/expired-action-code': 'Le lien de réinitialisation a expiré',
    'auth/invalid-action-code': 'Le lien de réinitialisation est invalide',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',

    // Token errors
    'auth/invalid-credential': 'Identifiants invalides',
    'auth/credential-already-in-use': 'Ces identifiants sont déjà utilisés',
    'auth/invalid-user-token': 'Session expirée, veuillez vous reconnecter',
    'auth/user-token-expired': 'Session expirée, veuillez vous reconnecter',

    // reCAPTCHA errors
    'auth/captcha-check-failed': 'Vérification reCAPTCHA échouée',
    'auth/invalid-app-credential': 'Configuration Firebase invalide',

    // Generic errors
    'auth/internal-error': 'Une erreur interne est survenue',
    'auth/invalid-api-key': 'Configuration Firebase invalide',
    'auth/app-deleted': "L'application a été supprimée",
    'auth/app-not-authorized': 'Application non autorisée',
    'auth/argument-error': 'Paramètres invalides',
    'auth/invalid-persistence-type': 'Type de persistance invalide',
    'auth/unsupported-persistence-type': 'Type de persistance non supporté',
    'auth/keychain-error': "Erreur d'accès au trousseau",
    'auth/missing-iframe-start': "Erreur d'initialisation",
    'auth/auth-domain-config-required': 'Configuration du domaine requise',
    'auth/cancelled-popup-request': 'Requête popup annulée',
    'auth/popup-blocked': 'Popup bloquée par le navigateur',
    'auth/popup-closed-by-user': "Popup fermée par l'utilisateur",
    'auth/unauthorized-domain': 'Domaine non autorisé (ajoutez localhost dans Firebase Authentication → Settings → Authorized domains)',
    'auth/web-storage-unsupported': 'Stockage web non supporté par votre navigateur',
    'auth/configuration-not-found':
      'Authentication Firebase non configurée sur ce projet. Vérifiez le projet Firebase Admin.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      'Clé API Firebase invalide — vérifiez VITE_FIREBASE_* dans .env',
  };

  if (errorMessages[errorCode]) return errorMessages[errorCode];

  // Surface unknown codes so local setup issues are diagnosable
  if (errorCode && errorCode !== 'unknown') {
    return `Erreur Firebase (${errorCode}). Vérifiez la configuration du projet.`;
  }
  return 'Une erreur est survenue, veuillez réessayer';
};

/**
 * Extracts error code from Firebase error
 */
export const getFirebaseErrorCode = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code;
  }
  return 'unknown';
};

/**
 * Gets user-friendly error message from Firebase error
 */
export const handleFirebaseError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // Do not surface backend 401 bodies (e.g. "Invalid token") as if they were tutor/app copy.
    if (status === 401) {
      return 'Session expirée ou non autorisée, veuillez vous reconnecter.';
    }
    if (status === 404) {
      return "Compte Firebase OK, mais cet utilisateur n'existe pas encore dans Ednov. Demandez une invitation ou lancez le seed.";
    }
    const api = pickNestMessage(error.response?.data);
    if (api) return api;
  }
  if (isNetworkError(error)) {
    return 'Erreur de connexion. Vérifiez votre connexion internet et réessayez';
  }

  const errorCode = getFirebaseErrorCode(error);
  return getFirebaseErrorMessage(errorCode);
};
