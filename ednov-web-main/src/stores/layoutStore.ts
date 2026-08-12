import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SidebarConfig } from '@/types/user.types';
import { updateInterfaceConfig } from '@/services/preferences.service';

interface LayoutStore {
  // Sidebar state
  isSidebarCollapsed: boolean;
  openMenus: string[]; // elementIds of open menus

  // Computed dimensions
  sidebarWidth: number; // 64px collapsed, 256px expanded
  navbarHeight: number; // 56px

  // Debounce timer for API calls
  saveTimer: ReturnType<typeof setTimeout> | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (_collapsed: boolean) => void;
  toggleMenu: (_menuId: string) => void;
  setOpenMenus: (_menuIds: string[]) => void;

  // Persistence
  saveSidebarState: () => Promise<void>;
  loadSidebarState: (_config: SidebarConfig) => void;
}

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 240; // 240px pour un look plus moderne
const NAVBAR_HEIGHT = 56;
const SAVE_DEBOUNCE_MS = 2000;

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      // Initial state - collapsed par défaut pour un look moderne
      isSidebarCollapsed: true,
      openMenus: [],
      sidebarWidth: COLLAPSED_WIDTH,
      navbarHeight: NAVBAR_HEIGHT,
      saveTimer: null,

      // Toggle sidebar collapsed state
      toggleSidebar: () => {
        const newCollapsed = !get().isSidebarCollapsed;
        set({
          isSidebarCollapsed: newCollapsed,
          sidebarWidth: newCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        });

        // Debounced save to API
        get().saveSidebarState();
      },

      // Set sidebar collapsed state directly
      setSidebarCollapsed: (collapsed: boolean) => {
        set({
          isSidebarCollapsed: collapsed,
          sidebarWidth: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        });

        // Debounced save to API
        get().saveSidebarState();
      },

      // Toggle menu open/closed
      toggleMenu: (menuId: string) => {
        const { openMenus } = get();
        const isOpen = openMenus.includes(menuId);

        const newOpenMenus = isOpen
          ? openMenus.filter((id) => id !== menuId)
          : [...openMenus, menuId];

        set({ openMenus: newOpenMenus });

        // Note: openMenus state is only saved locally (localStorage), not synced to API
      },

      // Set all open menus at once
      setOpenMenus: (menuIds: string[]) => {
        set({ openMenus: menuIds });

        // Note: openMenus state is only saved locally (localStorage), not synced to API
      },

      // Save sidebar state to API (debounced)
      saveSidebarState: async () => {
        const state = get();

        // Clear existing timer
        if (state.saveTimer) {
          clearTimeout(state.saveTimer);
        }

        // Set new debounced timer
        const timer = setTimeout(async () => {
          try {
            const sidebarConfig: SidebarConfig = {
              isCollapsed: state.isSidebarCollapsed,
              openMenus: state.openMenus,
              lastUpdated: new Date().toISOString(),
            };

            // Save to API via user preferences
            await updateInterfaceConfig('sidebar', sidebarConfig as Record<string, unknown>);

            // Sidebar state saved successfully
          } catch (error) {
            // Failed to save sidebar state (silent fail)
            if (error instanceof Error) {
              // Handle error silently or show toast
            }
          }
        }, SAVE_DEBOUNCE_MS);

        set({ saveTimer: timer });
      },

      // Load sidebar state from user preferences
      loadSidebarState: (config: SidebarConfig) => {
        set({
          isSidebarCollapsed: config.isCollapsed ?? true, // Collapsed par défaut
          // Note: openMenus is NOT loaded from API, we keep localStorage state
          sidebarWidth: (config.isCollapsed ?? true) ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        });

        // Sidebar state loaded successfully
      },
    }),
    {
      name: 'ednov-layout',
      // Persist to localStorage for immediate UX
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        openMenus: state.openMenus,
        sidebarWidth: state.sidebarWidth,
      }),
    },
  ),
);
