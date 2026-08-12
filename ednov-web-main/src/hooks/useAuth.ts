import { useAuthStore } from '@/stores/authStore';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';

export const useAuth = () => {
  const { user, isAuthenticated, logout: logoutStore } = useAuthStore();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      // Mark as intentional logout before signing out
      localStorage.setItem('intentional_logout', 'true');
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signOut error:', error);
    } finally {
      // Clear all React Query cache on logout
      queryClient.clear();
      logoutStore();
    }
  };

  return {
    user,
    isAuthenticated,
    logout,
  };
};
