import { useState, useCallback } from 'react';

interface UseDetailsViewReturn {
  openRowId: string | null;
  openRow: (id: string) => void;
  /** Sets the open row to `id` without toggling (idempotent). Useful for deep links. */
  setOpenRow: (id: string) => void;
  closeRow: () => void;
  isRowOpen: (id: string) => boolean;
}

export function useDetailsView(): UseDetailsViewReturn {
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const openRow = useCallback((id: string) => {
    setOpenRowId((current) => (current === id ? null : id));
  }, []);

  const setOpenRow = useCallback((id: string) => {
    setOpenRowId(id);
  }, []);

  const closeRow = useCallback(() => {
    setOpenRowId(null);
  }, []);

  const isRowOpen = useCallback(
    (id: string) => {
      return openRowId === id;
    },
    [openRowId],
  );

  return {
    openRowId,
    openRow,
    setOpenRow,
    closeRow,
    isRowOpen,
  };
}
