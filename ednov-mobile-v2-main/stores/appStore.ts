import { create } from 'zustand';

export type DashboardPeriod = 'week' | 'month';
export type SessionFilter = 'all' | 'week' | 'upcoming' | 'past';

interface AppState {
  dashboardPeriod: DashboardPeriod;
  sessionFilter: SessionFilter;
  setDashboardPeriod: (period: DashboardPeriod) => void;
  setSessionFilter: (filter: SessionFilter) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dashboardPeriod: 'week',
  sessionFilter: 'all',
  setDashboardPeriod: (period) => set({ dashboardPeriod: period }),
  setSessionFilter: (filter) => set({ sessionFilter: filter }),
}));
