import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const COMPANY_STORAGE_KEY = 'ednov_company_id';

/** Persisted state shape (partialized). */
type PersistedCompanyState = { companyId: string | null; roleCodes: string[] };

function normalizeCompanyId(id: unknown): string | null {
  if (id == null) return null;
  if (typeof id === 'string') return id.trim() || null;
  if (typeof id === 'object' && id !== null && 'id' in id) {
    const v = (id as { id: unknown }).id;
    return v != null && typeof v === 'string' ? v : null;
  }
  return null;
}

interface CompanyState {
  companyId: string | null;
  /** From GET /users/login (userRoles.role.code); used for API query flags e.g. tutor student list. */
  roleCodes: string[];
  /** Set by persist middleware when AsyncStorage rehydration completes; do not persist. */
  _hasRehydrated: boolean;
  setCompanyId: (id: string | null | Record<string, unknown>) => void;
  setRoleCodes: (codes: string[]) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      companyId: null,
      roleCodes: [],
      _hasRehydrated: false,
      setCompanyId: (id) => {
        const companyId = normalizeCompanyId(id);
        set(companyId == null ? { companyId: null, roleCodes: [] } : { companyId });
      },
      setRoleCodes: (codes) => set({ roleCodes: Array.isArray(codes) ? codes : [] }),
    }),
    {
      name: COMPANY_STORAGE_KEY,
      partialize: (state) =>
        ({ companyId: state.companyId, roleCodes: state.roleCodes } as PersistedCompanyState),
      merge: (persisted, current) => {
        const raw = persisted as PersistedCompanyState | null | undefined;
        const companyId = raw == null ? current.companyId : normalizeCompanyId(raw.companyId);
        const roleCodes = raw != null && Array.isArray(raw.roleCodes) ? raw.roleCodes : current.roleCodes;
        return { ...current, companyId, roleCodes };
      },
      onRehydrateStorage: () => (_rehydratedState, error) => {
        useCompanyStore.setState({ _hasRehydrated: true });
        if (__DEV__) {
          if (error) console.warn('[CompanyStore] Rehydration error:', error);
          else console.log('[CompanyStore] Rehydration done');
        }
      },
      storage: {
        getItem: async (name) => {
          try {
            const raw = await AsyncStorage.getItem(name);
            return raw == null ? null : (JSON.parse(raw) as { state: PersistedCompanyState; version?: number });
          } catch {
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch {
            // ignore
          }
        },
        removeItem: async (name) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch {
            // ignore
          }
        },
      },
    }
  )
);
