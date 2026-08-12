/**
 * Validation utilities for authentication forms
 */

export type IdentifierType = 'email' | 'phone' | 'unknown';

/**
 * Validates if a string is a valid email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates if a string is a valid phone number
 * Accepts international formats with +, spaces, dashes, parentheses
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters to check length
  const digitsOnly = phone.replaceAll(/\D/g, '');

  // Phone should have at least 6 digits and at most 15 (international standard)
  if (digitsOnly.length < 6 || digitsOnly.length > 15) {
    return false;
  }

  // Check if string contains only valid phone characters
  const phoneRegex = /^[\d\s\-+()]+$/;
  return phoneRegex.test(phone);
};

/**
 * Detects the type of identifier (email or phone)
 */
export const detectIdentifierType = (value: string): IdentifierType => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'unknown';
  }

  // Check if it's an email (contains @ and has valid format)
  if (isValidEmail(trimmedValue)) {
    return 'email';
  }

  // For phone detection, require only 3 digits minimum for early detection
  // But only if the value contains no letters (a-z) — "aaa123" is NOT a phone number
  const hasLetters = /[a-zA-Z]/.test(trimmedValue);
  const digitsOnly = trimmedValue.replaceAll(/\D/g, '');

  // Detect as phone if at least 3 digits and no alphabetic characters
  if (!hasLetters && digitsOnly.length >= 3) {
    return 'phone';
  }

  return 'unknown';
};

/**
 * Formats a phone number to E.164 format for Firebase
 * Assumes French numbers if no country code provided
 */
export const formatPhoneNumber = (phone: string, defaultCountryCode = '+33'): string => {
  // Remove all non-digit characters except leading +
  let cleaned = phone.trim();

  // If starts with +, keep it
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replaceAll(/\D/g, '');
  } else {
    cleaned = cleaned.replaceAll(/\D/g, '');

    // If starts with 0 (French format), remove it and add country code
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountryCode + cleaned.slice(1);
    } else if (!cleaned.startsWith('+')) {
      // Add default country code if no code present
      cleaned = defaultCountryCode + cleaned;
    }
  }

  return cleaned;
};

export interface PasswordRule {
  key: string;
  label: string;
  valid: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  rules: PasswordRule[];
}

/**
 * Validates password strength with enhanced security rules
 */
export const validatePassword = (password: string): PasswordValidation => {
  const rules: PasswordRule[] = [
    {
      key: 'length',
      label: 'Au moins 8 caractères',
      valid: password.length >= 8,
    },
    {
      key: 'upper',
      label: 'Au moins 1 lettre majuscule (A-Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      key: 'lower',
      label: 'Au moins 1 lettre minuscule (a-z)',
      valid: /[a-z]/.test(password),
    },
    {
      key: 'digit',
      label: 'Au moins 1 chiffre (0-9)',
      valid: /\d/.test(password),
    },
    {
      key: 'special',
      label: 'Au moins 1 caractère spécial',
      valid: /[^A-Za-z\d]/.test(password),
    },
  ];

  return {
    valid: rules.every((r) => r.valid),
    rules,
  };
};

/**
 * Sanitizes input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replaceAll(/[<>]/g, '').slice(0, 255);
};
