import { create } from 'zustand';

import type { SessionFilter, SessionStatus } from '@/types/session';

export type SessionCrStatusFilter = '' | 'pending' | 'submitted' | 'validated';

interface SessionFilterState {
  sessionFilter: SessionFilter;
  statusFilter: SessionStatus | null;
  crStatusFilter: SessionCrStatusFilter;
  setSessionFilter: (filter: SessionFilter) => void;
  setStatusFilter: (status: SessionStatus | null) => void;
  setCrStatusFilter: (cr: SessionCrStatusFilter) => void;
  resetFilters: () => void;
}

const defaultState = {
  sessionFilter: 'all' as SessionFilter,
  statusFilter: null as SessionStatus | null,
  crStatusFilter: '' as SessionCrStatusFilter,
};

export const useSessionFilterStore = create<SessionFilterState>((set) => ({
  ...defaultState,
  setSessionFilter: (sessionFilter) => set({ sessionFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setCrStatusFilter: (crStatusFilter) => set({ crStatusFilter }),
  resetFilters: () => set(defaultState),
}));
