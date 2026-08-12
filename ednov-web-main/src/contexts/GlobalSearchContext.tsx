import * as React from 'react';
import { createContext, useContext, ReactNode } from 'react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

type GlobalSearchContextType = ReturnType<typeof useGlobalSearch>;

const GlobalSearchContext = createContext<GlobalSearchContextType | null>(null);

export const GlobalSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const searchState = useGlobalSearch();

  return (
    <GlobalSearchContext.Provider value={searchState}>{children}</GlobalSearchContext.Provider>
  );
};

export const useGlobalSearchContext = (): GlobalSearchContextType => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearchContext must be used within GlobalSearchProvider');
  }
  return context;
};
