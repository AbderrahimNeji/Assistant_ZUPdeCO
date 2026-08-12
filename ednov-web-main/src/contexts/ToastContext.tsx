import * as React from 'react';

interface ToastContextValue {
  hasNavbar: boolean;
  setHasNavbar: (hasNavbar: boolean) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  hasNavbar: false,
  setHasNavbar: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasNavbar, setHasNavbar] = React.useState(false);

  const value = React.useMemo(() => ({ hasNavbar, setHasNavbar }), [hasNavbar]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToastLayout = () => React.useContext(ToastContext);
