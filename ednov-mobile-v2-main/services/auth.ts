import { Platform } from 'react-native';
import { signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

import api from '@/services/api';
import { auth } from '@/lib/firebase';
import { useCompanyStore } from '@/store/companyStore';
import { normalizePhoneNumber } from '@/utils/validation';

function extractRoleCodesFromLoginPayload(data: unknown): string[] {
  if (data == null || typeof data !== 'object') return [];
  const ur = (data as { userRoles?: unknown }).userRoles;
  if (!Array.isArray(ur)) return [];
  const codes: string[] = [];
  for (const item of ur) {
    if (item == null || typeof item !== 'object') continue;
    const role = (item as { role?: { code?: unknown } }).role;
    const code = role?.code;
    if (typeof code === 'string' && code.trim() !== '') codes.push(code);
  }
  return codes;
}

const phoneConfirmationResults = new Map<string, ConfirmationResult>();

/**
 * Backend user profile returned by GET /users/login (API docs: 01-api-endpoints, users.controller).
 * Auth: Bearer Firebase JWT.
 */
export interface LoginProfile {
  id: string;
  companyId: string;
  firebaseUid?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  displayName?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Calls GET /api/v1/users/login with the current Firebase token.
 * Use after signInWithEmailAndPassword or confirmPhoneOTP to ensure the user exists in the backend.
 * @throws on 401 (invalid token) or 404 (user not found in DB)
 */
export async function fetchLoginProfile(): Promise<LoginProfile> {
  if (__DEV__) console.log('[Auth] fetchLoginProfile: requesting GET /users/login');
  const { data } = await api.get<LoginProfile>('/users/login');
  useCompanyStore.getState().setRoleCodes(extractRoleCodesFromLoginPayload(data));
  if (__DEV__) console.log('[Auth] fetchLoginProfile: success', { id: data?.id, companyId: data?.companyId });
  return data;
}

/**
 * Send SMS OTP to phone number (Firebase Phone Auth). Native only (no reCAPTCHA on iOS/Android).
 * Stores ConfirmationResult for later use in confirmPhoneOTP.
 */
export async function sendPhoneOTP(phoneNumber: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('La connexion par téléphone est disponible uniquement sur l’app (iOS/Android).');
  }
  const normalized = normalizePhoneNumber(phoneNumber);
  const confirmationResult = await signInWithPhoneNumber(auth, normalized);
  phoneConfirmationResults.set(normalized, confirmationResult);
}

export function getPhoneConfirmationResult(phoneNumber: string): ConfirmationResult | undefined {
  return phoneConfirmationResults.get(normalizePhoneNumber(phoneNumber));
}

export function clearPhoneConfirmationResult(phoneNumber: string): void {
  phoneConfirmationResults.delete(normalizePhoneNumber(phoneNumber));
}

/**
 * Verify phone OTP code, then optionally fetch backend profile (same as email login).
 * On success Firebase user is set; AuthProvider will redirect to app.
 */
export async function confirmPhoneOTP(phoneNumber: string, otpCode: string): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  const confirmationResult = phoneConfirmationResults.get(normalized);
  if (!confirmationResult) {
    throw new Error('OTP session expirée. Veuillez demander un nouveau code.');
  }
  await confirmationResult.confirm(otpCode);
  phoneConfirmationResults.delete(normalized);

  const { env } = await import('@/config/env');
  if (env.apiUrl && !env.useStaticData) {
    try {
      const profile = await fetchLoginProfile();
      const { useCompanyStore } = await import('@/store/companyStore');
      useCompanyStore.getState().setCompanyId(profile.companyId ?? null);
    } catch (apiErr: unknown) {
      await auth.signOut();
      const status =
        apiErr && typeof apiErr === 'object' && 'status' in apiErr
          ? (apiErr as { status: number }).status
          : 0;
      const message =
        status === 401 || status === 404
          ? 'Compte non reconnu. Contactez votre administrateur.'
          : (apiErr && typeof apiErr === 'object' && 'message' in apiErr &&
                typeof (apiErr as { message: string }).message === 'string'
              ? (apiErr as { message: string }).message
              : 'Connexion impossible. Réessayez.');
      throw Object.assign(new Error(message), { status });
    }
  }
}

/**
 * Verify phone OTP for password reset flow only. Signs the user in so that
 * updatePassword can be called next; does not fetch backend profile or sign out on error.
 * Use after sendPhoneOTP when the user chose "Mot de passe oublié" by phone.
 */
export async function confirmPhoneOTPForPasswordReset(
  phoneNumber: string,
  otpCode: string
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  const confirmationResult = phoneConfirmationResults.get(normalized);
  if (!confirmationResult) {
    throw new Error('OTP session expirée. Veuillez demander un nouveau code.');
  }
  await confirmationResult.confirm(otpCode);
  phoneConfirmationResults.delete(normalized);
}
