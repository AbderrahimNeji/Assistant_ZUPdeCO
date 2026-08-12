import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuthStore } from '@/stores/authStore';
import { isTutorPlatformAccessDeniedMessage, pickNestMessage } from '@/utils/firebase-errors';
import { getApiV1BaseUrlFromEnv } from '@/lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: getApiV1BaseUrlFromEnv(import.meta.env.VITE_API_URL),
  timeout: Number.parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
});

// Request interceptor: auth token + replace /companies/current by user's companyId
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Backend attend /companies/:id (UUID), pas "current" → on remplace par le companyId de l'utilisateur
    const url = config.url ?? '';
    if (url.includes('companies/current')) {
      const companyId = useAuthStore.getState().user?.companyId;
      if (companyId) {
        config.url = url.replaceAll('companies/current', `companies/${companyId}`);
      } else {
        console.error('[api-client] companyId introuvable — requête bloquée.', {
          url,
          user: useAuthStore.getState().user,
        });
        return Promise.reject(
          new Error('Contexte entreprise indisponible. Veuillez recharger la page.'),
        );
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      try {
        await signOut(auth);
        // Clear auth store
        const { useAuthStore } = await import('@/stores/authStore');
        useAuthStore.getState().logout();

        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } catch (logoutError) {
        console.error('Error during logout:', logoutError);
      }
    }

    // Tutor denied staff app (403 + known phrase — matches api-client session flags; primary block is role-based in AuthProvider)
    if (error.response?.status === 403) {
      const errorMessage = pickNestMessage(error.response?.data) ?? '';
      if (isTutorPlatformAccessDeniedMessage(errorMessage)) {
        sessionStorage.setItem('tutor_blocked', 'true');
        sessionStorage.setItem('tutor_blocked_message', errorMessage);
      }
    }

    return Promise.reject(error);
  },
);

export { apiClient };
export default apiClient;
