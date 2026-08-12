import { onAuthStateChanged, type User } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { auth } from '@/lib/firebase';
import { clearAuthenticatedQueryCache } from '@/lib/queryClient';
import { useCompanyStore } from '@/store/companyStore';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setUser(null);
    useCompanyStore.getState().setCompanyId(null);
    await clearAuthenticatedQueryCache();
    await auth.signOut();
  }, []);

  const value: AuthContextValue = { user, loading, error, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
