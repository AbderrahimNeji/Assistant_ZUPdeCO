/**
 * Resolves the JWT signing secret. Fails fast when unset so production never
 * falls back to a known default.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'JWT_SECRET is required. Set a strong secret in the environment before starting the API.',
    );
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (secret.length < 32 || secret === 'assistant-secret-key')
  ) {
    throw new Error(
      'JWT_SECRET is too weak for production. Use at least 32 random characters.',
    );
  }

  return secret;
}
