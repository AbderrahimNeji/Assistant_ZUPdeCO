import * as React from 'react';
import { useLocation } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

import { useApplicationContextStore } from './store';
import type {
  ApplicationContext,
  CopilotFocusState,
  EntityRef,
  OpenAssistantOptions,
} from './types';

type ApplicationContextProviderProps = {
  children: React.ReactNode;
};

/**
 * Keeps locale + route-level page context fresh. Pages call setSelection /
 * setEntity / openAssistant for entity-specific launches.
 */
export const ApplicationContextProvider: React.FC<ApplicationContextProviderProps> = ({
  children,
}) => {
  const location = useLocation();
  const setPageContext = useApplicationContextStore((s) => s.setPageContext);
  const patchContext = useApplicationContextStore((s) => s.patchContext);
  const onPageNavigated = useApplicationContextStore((s) => s.onPageNavigated);
  const companyId = useAuthStore((s) => s.user?.companyId);
  const companyName = useThemeStore((s) => s.companyName);

  React.useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const interfaceId = segments[1] === 'dashboard' ? segments[2] : segments[1];
    const title = interfaceId
      ? interfaceId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Dashboard';

    const current = useApplicationContextStore.getState().context;
    const samePage =
      current.page?.route === location.pathname &&
      current.page?.interfaceId === interfaceId &&
      current.page?.title === title;

    if (!samePage) {
      onPageNavigated();
      setPageContext({
        route: location.pathname,
        interfaceId,
        title,
      });
    }
    const browserLocale =
      typeof navigator !== 'undefined' ? navigator.language || 'fr' : 'fr';
    if (current.locale !== browserLocale) {
      patchContext({ locale: browserLocale });
    }
  }, [location.pathname, setPageContext, patchContext, onPageNavigated]);

  React.useEffect(() => {
    if (!companyId && !companyName) return;
    const label = companyName?.trim() || 'Organisation';
    const current = useApplicationContextStore.getState().context.company;
    if (
      current?.id === (companyId || 'company') &&
      current.label === label
    ) {
      return;
    }
    patchContext({
      company: {
        type: 'company',
        id: companyId || 'company',
        label,
        company: label,
        role: 'company',
      },
    });
  }, [companyId, companyName, patchContext]);

  return <>{children}</>;
};

export function useApplicationContext(): ApplicationContext {
  return useApplicationContextStore((s) => s.context);
}

export function useCopilotFocus(): CopilotFocusState {
  return useApplicationContextStore((s) => s.focus);
}

/**
 * Stable launcher API. Do NOT wrap store actions in new lambdas here — that
 * recreates function identities every render and breaks effects that list them
 * as deps (infinite setState / Maximum update depth on students & sessions).
 */
export function useAssistantLauncher() {
  const openAssistant = useApplicationContextStore((s) => s.openAssistant);
  const setSelection = useApplicationContextStore((s) => s.setSelection);
  const setEntity = useApplicationContextStore((s) => s.setEntity);
  const setFilters = useApplicationContextStore((s) => s.setFilters);
  const clearSelection = useApplicationContextStore((s) => s.clearSelection);
  const patchContext = useApplicationContextStore((s) => s.patchContext);
  const setManualFocus = useApplicationContextStore((s) => s.setManualFocus);
  const toggleCompareEntity = useApplicationContextStore((s) => s.toggleCompareEntity);
  const pinFocus = useApplicationContextStore((s) => s.pinFocus);
  const clearFocus = useApplicationContextStore((s) => s.clearFocus);

  return {
    openAssistant,
    setSelection,
    setEntity,
    setFilters,
    clearSelection,
    patchContext,
    setManualFocus,
    toggleCompareEntity,
    pinFocus,
    clearFocus,
    /** Non-reactive snapshot — use `useApplicationContext()` when you need live updates. */
    getContext: () => useApplicationContextStore.getState().context,
  };
}

export type { OpenAssistantOptions, EntityRef };
