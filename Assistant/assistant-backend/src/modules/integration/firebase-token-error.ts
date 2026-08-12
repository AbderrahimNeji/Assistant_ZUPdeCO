export type FirebaseTokenErrorKind = 'revoked' | 'invalid' | 'infra';

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code ?? '');
  }
  return '';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? '');
}

/**
 * Distinguishes a truly revoked/invalid session from a revocation-check
 * infrastructure failure (IAM, network, Firebase internal).
 */
export function classifyFirebaseTokenError(error: unknown): FirebaseTokenErrorKind {
  const code = errorCode(error);
  const blob = `${code} ${errorMessage(error)}`.toLowerCase();

  if (
    code === 'auth/id-token-revoked' ||
    code === 'auth/user-disabled' ||
    blob.includes('id-token-revoked') ||
    blob.includes('user-disabled')
  ) {
    return 'revoked';
  }

  if (
    code === 'auth/id-token-expired' ||
    code === 'auth/argument-error' ||
    code === 'auth/invalid-id-token' ||
    code === 'auth/user-not-found' ||
    blob.includes('id-token-expired') ||
    blob.includes('invalid-id-token') ||
    blob.includes('invalid id token') ||
    blob.includes('decoding firebase id token failed')
  ) {
    return 'invalid';
  }

  return 'infra';
}

export function firebaseErrorLogLabel(error: unknown): string {
  const code = errorCode(error);
  const message = errorMessage(error);
  return code || message || 'unknown';
}
