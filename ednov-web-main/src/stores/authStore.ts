import { create } from 'zustand';
import { User, UserPreferences } from '@/types/user.types';
import { UserRole, InterfaceAccess } from '@/types/permissions.types';
import { usePreferencesStore } from './preferencesStore';
import { useInterfaceElementsStore } from './interfaceElementsStore';

interface AuthStore {
  user: User | null;
  roles: UserRole[];
  interfaceAccess: Record<string, InterfaceAccess>;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;

  setUser: (_user: User | null) => void;
  setRoles: (_roles: UserRole[]) => void;
  setInterfaceAccess: (_access: Record<string, InterfaceAccess>) => void;
  setPreferences: (_preferences: UserPreferences | null) => void;
  setAuthData: (
    _user: User,
    _roles: UserRole[],
    _interfaceAccess?: Record<string, InterfaceAccess>,
  ) => void;
  setBootstrapping: (_isBootstrapping: boolean) => void;

  canViewInterface: (_interfaceName: string) => boolean;
  canEditInterface: (_interfaceName: string) => boolean;
  canViewElement: (_interfaceName: string, _elementId: string) => boolean;
  canEditElement: (_interfaceName: string, _elementId: string) => boolean;
  canViewMenu: (_menuId: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  roles: [],
  interfaceAccess: {},
  preferences: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setRoles: (roles) => {
    set({ roles });
  },

  setInterfaceAccess: (access) => {
    set({ interfaceAccess: access });
  },

  setPreferences: (preferences) => {
    set({ preferences });
  },

  setAuthData: (user, roles, interfaceAccess = {}) => {
    set({
      user,
      roles,
      interfaceAccess,
      isAuthenticated: true,
      isBootstrapping: false,
    });
  },

  setBootstrapping: (isBootstrapping) => {
    set({ isBootstrapping });
  },

  canViewInterface: (interfaceName: string) => {
    // Modèle présence : si l'interface a des éléments, l'utilisateur y a accès
    const elements = useInterfaceElementsStore.getState().elementsByInterface[interfaceName];
    return (elements?.length ?? 0) > 0;
  },

  canEditInterface: (interfaceName: string) => {
    // Modèle présence : même logique que canViewInterface (pas de distinction)
    const elements = useInterfaceElementsStore.getState().elementsByInterface[interfaceName];
    return (elements?.length ?? 0) > 0;
  },

  canViewElement: (interfaceName: string, elementId: string) => {
    const { interfaceAccess } = get();
    const access = interfaceAccess[interfaceName];
    return access?.elements?.[elementId]?.visible ?? false;
  },

  canEditElement: (interfaceName: string, elementId: string) => {
    const { interfaceAccess } = get();
    const access = interfaceAccess[interfaceName];
    return access?.elements?.[elementId]?.editable ?? false;
  },

  canViewMenu: (menuId: string) => {
    const { interfaceAccess } = get();
    // Menus are in the 'sidebar' interface
    const sidebarAccess = interfaceAccess['sidebar'];
    if (!sidebarAccess) return false;

    // Check if this specific menu element is visible
    const menuElement = sidebarAccess.elements?.[menuId];
    return menuElement?.visible ?? false;
  },

  logout: () => {
    set({
      user: null,
      roles: [],
      interfaceAccess: {},
      preferences: null,
      isAuthenticated: false,
      isBootstrapping: false,
    });

    // Clear preferences store
    usePreferencesStore.getState().clearPreferences();

    // Clear interface elements store
    useInterfaceElementsStore.getState().clearElements();

    // Clear persisted stores (preferences + interface elements)
    try {
      localStorage.removeItem('ednov-preferences');
      localStorage.removeItem('interface-elements-store');
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  },
}));
