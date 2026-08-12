import axios, { type AxiosError } from 'axios';
import { Platform } from 'react-native';

import { env, getWebApiMisconfigurationHint } from '@/config/env';
import { auth } from '@/lib/firebase';
import { clearAuthenticatedQueryCache } from '@/lib/queryClient';
import { useCompanyStore } from '@/store/companyStore';
import { getApiV1BaseUrlFromEnv } from '@/lib/apiBaseUrl';

const api = axios.create({
  baseURL: getApiV1BaseUrlFromEnv(env.apiUrl) || undefined,
  headers: { 'Content-Type': 'application/json' },
});

let webApiMisconfigWarned = false;

api.interceptors.request.use(
  async (config) => {
    if (!webApiMisconfigWarned && Platform.OS === 'web') {
      webApiMisconfigWarned = true;
      const hint = getWebApiMisconfigurationHint();
      if (hint) console.warn('[API] Configuration probablement incorrecte :', hint);
    }
    const user = auth.currentUser;
    if (__DEV__) {
      const url = (config.baseURL ?? '') + (config.url ?? '');
      console.log('[API] request', config.method?.toUpperCase(), url, { hasUser: !!user });
    }
    if (user) {
      try {
        const token = await user.getIdToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch (e) {
        if (__DEV__) console.warn('[API] getIdToken failed', e);
        // no token, request goes without Authorization
      }
    }
    // Let the runtime set Content-Type with boundary for FormData (e.g. file uploads).
    if (config.data != null && typeof (config.data as { append?: unknown }).append === 'function') {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      try {
        useCompanyStore.getState().setCompanyId(null);
        await clearAuthenticatedQueryCache();
        await auth.signOut();
      } catch {
        // ignore signOut errors
      }
    }
    const data = err.response?.data;
    const status = err.response?.status ?? 0;
    let message: string;
    if (data != null && typeof data === 'object' && !Array.isArray(data) && 'message' in data) {
      const m = (data as { message: string | string[] }).message;
      message = Array.isArray(m) ? String(m[0] ?? '') : String(m);
    } else if (typeof data === 'string' && data.trim()) {
      message = data.trim().slice(0, 500);
    } else {
      message = err.message ?? 'Request failed';
    }
    return Promise.reject({ message, status });
  }
);

export default api;
