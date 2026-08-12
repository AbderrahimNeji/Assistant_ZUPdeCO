import { useAuthStore } from '@/stores/authStore';

/**
 * Hook to access the connected user and their roles
 * @returns Object containing user info and role checks
 */
export function useConnectedUser() {
  const { user, roles, isAuthenticated } = useAuthStore();

  const isVolunteer = roles.some((r) => r.code.toLowerCase() === 'volunteer');
  const isVsc = roles.some((r) => r.code.toLowerCase() === 'vsc');
  const isTutor = roles.some((r) => r.code.toLowerCase() === 'tutor');
  const isStudent = roles.some((r) => r.code.toLowerCase() === 'student');
  const isAdmin = roles.some((r) => r.code.toLowerCase() === 'admin');
  const isManager = roles.some((r) => r.code.toLowerCase() === 'manager');
  const isCoordinator = roles.some((r) => r.code.toLowerCase() === 'coordinator');

  return {
    user,
    roles,
    isAuthenticated,
    isVolunteer,
    isVsc,
    isTutor,
    isStudent,
    isAdmin,
    isManager,
    isCoordinator,
  };
}
