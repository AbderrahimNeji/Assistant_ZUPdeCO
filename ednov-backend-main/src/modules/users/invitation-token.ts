import * as jwt from 'jsonwebtoken';

/** Activation link lifetime (JWT `expiresIn`). */
export const ACTIVATION_TOKEN_EXPIRES_IN = '14d';

/** Human-readable validity for activation emails (French). */
export const ACTIVATION_TOKEN_VALIDITY_LABEL = '14 jours';

const TOKEN_PURPOSE = 'account_activation';

export interface ActivationTokenPayload {
  /** User id (DB). */
  sub: string;
  email: string;
  companyId: string;
  /** Primary role group (e.g. "tutors") — used by the frontend for post-activation redirect. */
  roleGroup: string | null;
  /** Invitation generation; must match the Firebase custom claim `inviteGen` to be accepted. */
  gen: number;
  purpose: typeof TOKEN_PURPOSE;
}

function getSecret(): string {
  const secret = process.env.INVITATION_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'INVITATION_JWT_SECRET is not configured — cannot sign or verify activation tokens.',
    );
  }
  return secret;
}

export function signActivationToken(
  input: Omit<ActivationTokenPayload, 'purpose'>,
): string {
  const payload: ActivationTokenPayload = { ...input, purpose: TOKEN_PURPOSE };
  return jwt.sign(payload, getSecret(), {
    expiresIn: ACTIVATION_TOKEN_EXPIRES_IN,
  });
}

export class ActivationTokenError extends Error {
  constructor(
    message: string,
    readonly reason: 'expired' | 'invalid',
  ) {
    super(message);
    this.name = 'ActivationTokenError';
  }
}

export function verifyActivationToken(token: string): ActivationTokenPayload {
  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(token, getSecret());
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ActivationTokenError('Activation link has expired', 'expired');
    }
    throw new ActivationTokenError('Invalid activation link', 'invalid');
  }

  if (typeof decoded === 'string' || decoded.purpose !== TOKEN_PURPOSE) {
    throw new ActivationTokenError('Invalid activation link', 'invalid');
  }

  const payload = decoded as jwt.JwtPayload & Partial<ActivationTokenPayload>;
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.companyId !== 'string' ||
    typeof payload.gen !== 'number'
  ) {
    throw new ActivationTokenError('Invalid activation link', 'invalid');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    companyId: payload.companyId,
    roleGroup: payload.roleGroup ?? null,
    gen: payload.gen,
    purpose: TOKEN_PURPOSE,
  };
}
