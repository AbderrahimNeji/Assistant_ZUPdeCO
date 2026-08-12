import { useEffect, useCallback } from 'react';

interface UseFormPersistenceOptions<T> {
  formId: string;
  formData: T;
  isDirty: boolean;
  autoSaveInterval?: number;
  enabled?: boolean;
}

export const useFormPersistence = <T extends Record<string, any>>({
  formId,
  formData,
  isDirty,
  autoSaveInterval = 30000,
  enabled = true,
}: UseFormPersistenceOptions<T>) => {
  const storageKey = `form-draft-${formId}`;

  const saveDraft = useCallback(() => {
    if (enabled && isDirty) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      } catch (error) {
        console.error('Failed to save form draft:', error);
      }
    }
  }, [enabled, isDirty, formData, storageKey]);

  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null;

    try {
      const draft = localStorage.getItem(storageKey);
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error('Failed to load form draft:', error);
      return null;
    }
  }, [enabled, storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear form draft:', error);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const interval = setInterval(saveDraft, autoSaveInterval);
    return () => clearInterval(interval);
  }, [enabled, isDirty, autoSaveInterval, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft: !!localStorage.getItem(storageKey),
  };
};
