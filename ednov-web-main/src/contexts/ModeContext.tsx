import * as React from 'react';

export type AppMode = 'in_person' | 'remote';

interface ModeContextValue {
  /** Current app mode (présentiel / distanciel). */
  mode: AppMode;
  /** Switch to a different mode. No-op if the user's role doesn't support it. */
  setMode: (mode: AppMode) => void;
  /** True if the authenticated user's role supports mode switching (hybrid role). */
  canSwitchMode: boolean;
}

const ModeContext = React.createContext<ModeContextValue>({
  mode: 'in_person',
  setMode: () => undefined,
  canSwitchMode: false,
});

const MODE_STORAGE_KEY = 'ednov:app-mode';

interface ModeProviderProps {
  children: React.ReactNode;
  /**
   * Whether the current user has a hybrid role. Pass from auth store.
   * When false, mode is always 'in_person' and the switch button is hidden.
   */
  isHybridRole?: boolean;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children, isHybridRole = false }) => {
  const [mode, setModeState] = React.useState<AppMode>(() => {
    if (!isHybridRole) return 'in_person';
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'remote' ? 'remote' : 'in_person';
  });

  const setMode = React.useCallback(
    (nextMode: AppMode) => {
      if (!isHybridRole) return;
      setModeState(nextMode);
      localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    },
    [isHybridRole],
  );

  React.useEffect(() => {
    if (!isHybridRole) {
      setModeState('in_person');
    }
  }, [isHybridRole]);

  const value = React.useMemo<ModeContextValue>(
    () => ({ mode, setMode, canSwitchMode: isHybridRole }),
    [mode, setMode, isHybridRole],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

export const useMode = (): ModeContextValue => React.useContext(ModeContext);
