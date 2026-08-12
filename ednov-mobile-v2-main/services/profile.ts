import { env } from '@/config/env';
import api from '@/services/api';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoUrl?: string;
}

/**
 * Update current user profile via PATCH /users/me (or static mock).
 */
export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  if (env.useStaticData) {
    return Promise.resolve();
  }
  if (env.apiUrl) {
    await api.patch('/users/me', payload);
    return;
  }
  return Promise.resolve();
}
