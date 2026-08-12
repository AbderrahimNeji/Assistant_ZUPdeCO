import * as React from 'react';
import type { PostIt } from '@/types/post-it.types';

export interface UsePostItFiltersReturn {
  deadlineFrom: string;
  deadlineTo: string;
  setDeadlineFrom: (date: string) => void;
  setDeadlineTo: (date: string) => void;
  filteredCount: number;
  hasActiveFilters: boolean;
  reset: () => void;
}

export function usePostItFilters(
  postIts: PostIt[],
  deadlineFrom: string,
  setDeadlineFrom: (v: string) => void,
  deadlineTo: string,
  setDeadlineTo: (v: string) => void,
): UsePostItFiltersReturn {
  const filteredCount = React.useMemo(() => postIts.filter((p) => !p.isArchived).length, [postIts]);

  const reset = React.useCallback(() => {
    setDeadlineFrom('');
    setDeadlineTo('');
  }, [setDeadlineFrom, setDeadlineTo]);

  return {
    deadlineFrom,
    deadlineTo,
    setDeadlineFrom,
    setDeadlineTo,
    filteredCount,
    hasActiveFilters: !!deadlineFrom || !!deadlineTo,
    reset,
  };
}
