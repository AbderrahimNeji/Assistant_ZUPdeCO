import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { InterfaceElement } from '@/types/interface-elements.types';

interface InterfaceElementsStore {
  elementsByInterface: Record<string, InterfaceElement[]>;
  isLoaded: boolean;
  loadedInterfaces: Set<string>;
  loadingInterfaces: Set<string>;

  setInterfaceElements: (
    interfaceNameOrData: string | Record<string, InterfaceElement[]>,
    elements?: InterfaceElement[],
  ) => void;
  clearElements: () => void;

  getElements: (interfaceName: string) => InterfaceElement[];
  isInterfaceLoaded: (interfaceName: string) => boolean;
  isInterfaceLoading: (interfaceName: string) => boolean;
  startLoading: (interfaceName: string) => void;
  finishLoading: (interfaceName: string) => void;
}

type PersistedState = {
  elementsByInterface: Record<string, InterfaceElement[]>;
  isLoaded: boolean;
  loadedInterfaces: string[];
};

export const useInterfaceElementsStore = create<InterfaceElementsStore>()(
  persist(
    (set, get) => ({
      elementsByInterface: {},
      isLoaded: false,
      loadedInterfaces: new Set<string>(),
      loadingInterfaces: new Set<string>(),

      setInterfaceElements: (
        interfaceNameOrData: string | Record<string, InterfaceElement[]>,
        elements?: InterfaceElement[],
      ) => {
        if (typeof interfaceNameOrData === 'string') {
          const interfaceName = interfaceNameOrData;
          set((state) => {
            const newLoading = new Set(state.loadingInterfaces);
            newLoading.delete(interfaceName);
            return {
              elementsByInterface: {
                ...state.elementsByInterface,
                [interfaceName]: elements || [],
              },
              loadedInterfaces: new Set([...state.loadedInterfaces, interfaceName]),
              loadingInterfaces: newLoading,
              isLoaded: true,
            };
          });
        } else {
          const data = interfaceNameOrData;
          set((state) => {
            const newLoading = new Set(state.loadingInterfaces);
            for (const name of Object.keys(data)) newLoading.delete(name);
            return {
              elementsByInterface: data,
              isLoaded: true,
              loadedInterfaces: new Set(Object.keys(data)),
              loadingInterfaces: newLoading,
            };
          });
        }
      },

      clearElements: () => {
        set({
          elementsByInterface: {},
          isLoaded: false,
          loadedInterfaces: new Set<string>(),
          loadingInterfaces: new Set<string>(),
        });
      },

      getElements: (interfaceName: string) => {
        return get().elementsByInterface[interfaceName];
      },

      isInterfaceLoaded: (interfaceName: string) => {
        return get().loadedInterfaces.has(interfaceName);
      },

      isInterfaceLoading: (interfaceName: string) => {
        return get().loadingInterfaces.has(interfaceName);
      },

      startLoading: (interfaceName: string) => {
        set((state) => ({
          loadingInterfaces: new Set([...state.loadingInterfaces, interfaceName]),
        }));
      },

      finishLoading: (interfaceName: string) => {
        set((state) => {
          const newLoading = new Set(state.loadingInterfaces);
          newLoading.delete(interfaceName);
          return { loadingInterfaces: newLoading };
        });
      },
    }),
    {
      name: 'interface-elements-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        elementsByInterface: state.elementsByInterface,
        isLoaded: state.isLoaded,
        loadedInterfaces: Array.from(state.loadedInterfaces),
      }),
      merge: (persisted, current) => {
        const p = persisted as PersistedState;
        return {
          ...current,
          elementsByInterface: p.elementsByInterface ?? {},
          isLoaded: p.isLoaded ?? false,
          loadedInterfaces: new Set(p.loadedInterfaces ?? []),
        };
      },
    },
  ),
);
