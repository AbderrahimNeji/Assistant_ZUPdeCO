import { create } from 'zustand';

const ALL_PROGRAMS_VALUE = '';

interface StudentSearchState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Selected programme filter; empty string = "Tous". */
  programFilter: string;
  setProgramFilter: (program: string) => void;
}

export const useStudentSearchStore = create<StudentSearchState>((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  programFilter: ALL_PROGRAMS_VALUE,
  setProgramFilter: (programFilter) => set({ programFilter }),
}));

export { ALL_PROGRAMS_VALUE };
