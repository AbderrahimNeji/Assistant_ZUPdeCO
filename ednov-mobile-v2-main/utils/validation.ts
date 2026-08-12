/**
 * Validation helpers for login (v1 parity).
 * Used for "Email ou Téléphone" identifier and password.
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validateFrenchPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/\s/g, '');
  if (clean.length < 10 || clean.length > 13) return false;
  const phoneRegex = /^(\+33[1-9]\d{8}|0033[1-9]\d{8}|33[1-9]\d{8}|0[1-9]\d{8})$/;
  return phoneRegex.test(clean);
}

function isPhoneNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const clean = value.replace(/\s/g, '');
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(clean) && clean.replace(/\D/g, '').length >= 10;
}

/** Detect if input looks like email, phone, or neither (for UI: icon, keyboard, show password). */
export function isEmailOrPhone(value: string): 'email' | 'phone' | 'unknown' {
  if (!value || typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  if (validateEmail(trimmed)) return 'email';
  if (isPhoneNumber(trimmed)) return 'phone';
  return 'unknown';
}

/**
 * Normalize phone to E.164-style for Firebase (e.g. +33...).
 * Same logic as v1 validationUtils.normalizePhoneNumber.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+33' + normalized.substring(1);
  } else if (normalized.startsWith('33') && !normalized.startsWith('+33')) {
    normalized = '+' + normalized;
  } else if (normalized.startsWith('0033')) {
    normalized = '+33' + normalized.substring(4);
  } else if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}
