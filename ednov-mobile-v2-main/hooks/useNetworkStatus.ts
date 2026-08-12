import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * True when we consider the device offline (no connection or not reachable).
 * Unknown state is treated as online to avoid blocking the user.
 */
export function useNetworkStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Fetch initial state immediately so isOffline is accurate before the first event fires.
    NetInfo.fetch().then((state: NetInfoState) => {
      const offline =
        state.isConnected === false ||
        (state.isInternetReachable === false && state.isConnected !== null);
      setIsOffline(offline);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline =
        state.isConnected === false ||
        (state.isInternetReachable === false && state.isConnected !== null);
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  return { isOffline };
}
