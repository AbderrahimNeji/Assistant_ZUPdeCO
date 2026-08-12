import { useAuthStore } from '@/stores/authStore';

export const usePermissions = () => {
  const { canViewInterface, canEditInterface, canViewElement, canEditElement, canViewMenu } =
    useAuthStore();

  return {
    canViewInterface,
    canEditInterface,
    canViewElement,
    canEditElement,
    canViewMenu,
  };
};
