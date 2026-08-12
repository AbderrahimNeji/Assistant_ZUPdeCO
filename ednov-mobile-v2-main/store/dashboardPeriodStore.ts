import { create } from 'zustand';

import type { DashboardPeriod } from '@/types/dashboard';

interface DashboardPeriodState {
  dashboardPeriod: DashboardPeriod;
  setDashboardPeriod: (period: DashboardPeriod) => void;
}

export const useDashboardPeriodStore = create<DashboardPeriodState>((set) => ({
  dashboardPeriod: 'week',
  setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
}));
