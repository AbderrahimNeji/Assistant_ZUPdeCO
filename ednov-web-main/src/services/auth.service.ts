import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  RecaptchaVerifier,
  ConfirmationResult,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import apiClient from './api-client';
import type { User } from '@/types/user.types';

/**
 * Login with email and password
 */
export const loginWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error logging in with email:', error);
    throw error;
  }
};

/**
 * Send OTP to phone number
 */
export const sendPhoneOtp = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending phone OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP code
 */
export const verifyPhoneOtp = async (
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<UserCredential> => {
  try {
    const userCredential = await confirmationResult.confirm(code);
    return userCredential;
  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    throw error;
  }
};

/**
 * Activate an account from an email invitation token (sets the password).
 * Public endpoint — no Firebase auth required.
 */
export const activateAccount = async (
  token: string,
  password: string,
): Promise<{ activated: boolean; email: string; roleGroup: string | null }> => {
  const { data } = await apiClient.post('/users/activate', { token, password });
  return data;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Fetch user data from backend after Firebase authentication
 */
export const fetchUserData = async (): Promise<User> => {
  try {
    const { data } = await apiClient.get('/users/login');
    return data;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

/**
 * Get current Firebase ID token
 */
export const getCurrentToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting current token:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

/**
 * Login with Google
 */
export const loginWithGoogle = async (): Promise<UserCredential> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential;
  } catch (error) {
    console.error('Error logging in with Google:', error);
    throw error;
  }
};

/**
 * Login with Microsoft
 */
export const loginWithMicrosoft = async (): Promise<UserCredential> => {
  try {
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential;
  } catch (error) {
    console.error('Error logging in with Microsoft:', error);
    throw error;
  }
};
