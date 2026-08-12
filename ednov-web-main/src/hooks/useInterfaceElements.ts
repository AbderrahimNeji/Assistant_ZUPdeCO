import * as React from 'react';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import { useAuthStore } from '@/stores/authStore';
import { getInterfaceElements } from '@/services/interface-elements.service';

const EMPTY_ARRAY: any[] = [];

export const useInterfaceElements = (interfaceName: string) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  const rawElements = useInterfaceElementsStore(
    (state) => state.elementsByInterface[interfaceName] ?? EMPTY_ARRAY,
  );

  const isLoaded = useInterfaceElementsStore((state) => state.loadedInterfaces.has(interfaceName));
  const isLoading = useInterfaceElementsStore((state) =>
    state.loadingInterfaces.has(interfaceName),
  );

  const startLoading = useInterfaceElementsStore((state) => state.startLoading);
  const finishLoading = useInterfaceElementsStore((state) => state.finishLoading);
  const setInterfaceElements = useInterfaceElementsStore((state) => state.setInterfaceElements);

  // Auto-fetch when the interface is not in the store and not currently being fetched.
  // Guard on isAuthenticated to prevent spurious fetches during logout (clearElements()
  // resets isLoaded while components are still mounted, triggering re-fetch otherwise).
  // Guard on isBootstrapping to prevent API calls before AuthProvider finishes loading critical data.
  React.useEffect(() => {
    if (!isAuthenticated || isBootstrapping) return;

    // Read directly from store (not from closure) to avoid stale-closure race condition:
    // when multiple components mount in the same React commit, they all capture
    // isLoading=false at render time. Reading the store here ensures each effect
    // sees the up-to-date value set by whichever effect ran first.
    const { loadedInterfaces, loadingInterfaces } = useInterfaceElementsStore.getState();
    if (loadedInterfaces.has(interfaceName) || loadingInterfaces.has(interfaceName)) return;

    startLoading(interfaceName);
    getInterfaceElements(interfaceName)
      .then((data) => {
        setInterfaceElements(interfaceName, data);
      })
      .catch(() => {
        finishLoading(interfaceName);
      });
  }, [
    interfaceName,
    isAuthenticated,
    isBootstrapping,
    isLoaded,
    isLoading,
    startLoading,
    finishLoading,
    setInterfaceElements,
  ]);

  const elements = React.useMemo(() => {
    return rawElements
      .filter((el) => el.visible !== false)
      .sort((a, b) => {
        const orderA = a.userOrder ?? a.order ?? Infinity;
        const orderB = b.userOrder ?? b.order ?? Infinity;
        return orderA - orderB;
      });
  }, [rawElements]);

  const refetch = React.useCallback(async () => {
    try {
      const data = await getInterfaceElements(interfaceName);
      setInterfaceElements(interfaceName, data);
    } catch (error) {
      console.error('Failed to refetch interface elements:', error);
    }
  }, [interfaceName, setInterfaceElements]);

  return {
    elements,
    allElements: rawElements,
    isLoading: !isLoaded,
    error: null,
    refetch,
  };
};
