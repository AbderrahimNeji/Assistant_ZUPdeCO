import { create } from 'zustand';

/** Date period for CR list filter (by session date or submittedAt). */
export type CrDatePeriod = 'all' | 'week' | 'month';

/** Report status filter: tous = all, a-saisir = draft, saisi = submitted, valide = validated. */
export type CrReportStatusFilter = 'tous' | 'a-saisir' | 'saisi' | 'valide';

interface CrFilterState {
  datePeriod: CrDatePeriod;
  reportStatus: CrReportStatusFilter;
  setDatePeriod: (period: CrDatePeriod) => void;
  setReportStatus: (status: CrReportStatusFilter) => void;
  resetFilters: () => void;
}

const defaultState = {
  datePeriod: 'all' as CrDatePeriod,
  reportStatus: 'tous' as CrReportStatusFilter,
};

export const useCrFilterStore = create<CrFilterState>((set) => ({
  ...defaultState,
  setDatePeriod: (datePeriod) => set({ datePeriod }),
  setReportStatus: (reportStatus) => set({ reportStatus }),
  resetFilters: () => set(defaultState),
}));
