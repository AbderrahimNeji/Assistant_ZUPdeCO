import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

import {
  decorateEntity,
  emptyFocus,
  entityKeyForType,
  pagePrimaryFromContext,
  rememberRecent,
  sameEntity,
} from './focus';
import type {
  ApplicationContext,
  CopilotFocusState,
  CopilotUiState,
  EntityRef,
  OpenAssistantOptions,
} from './types';

type EntityKey = keyof Pick<
  ApplicationContext,
  | 'program'
  | 'session'
  | 'student'
  | 'tutor'
  | 'document'
  | 'course'
  | 'benchmark'
  | 'establishment'
  | 'matching'
  | 'report'
  | 'parent'
  | 'user'
  | 'company'
>;

type ApplicationContextState = {
  context: ApplicationContext;
  ui: CopilotUiState;
  focus: CopilotFocusState;
  setPageContext: (page: NonNullable<ApplicationContext['page']>) => void;
  setSelection: (primary: EntityRef | null, entities?: EntityRef[]) => void;
  setFilters: (filters: Record<string, unknown> | undefined) => void;
  setEntity: (key: EntityKey, value: EntityRef | undefined) => void;
  patchContext: (partial: Partial<ApplicationContext>) => void;
  clearSelection: () => void;
  /** Route changed — follow page entities unless focus is pinned. */
  onPageNavigated: () => void;
  setManualFocus: (ref: EntityRef) => void;
  toggleCompareEntity: (ref: EntityRef) => void;
  pinFocus: (pinned?: boolean) => void;
  clearFocus: () => void;
  openAssistant: (options?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  minimizeAssistant: () => void;
  restoreAssistant: () => void;
  setMaximized: (maximized: boolean) => void;
  setPanelPosition: (position: { right: number; bottom: number }) => void;
  consumePendingPrompt: () => { prompt: string; autoSend: boolean } | null;
};

const emptyUi: CopilotUiState = {
  open: false,
  docked: false,
  maximized: false,
  pendingPrompt: null,
  autoSendPending: false,
};

function decorate(ref: EntityRef, page?: ApplicationContext['page']): EntityRef {
  const companyName = useThemeStore.getState().companyName?.trim();
  const companyId = useAuthStore.getState().user?.companyId;
  return decorateEntity(ref, {
    company: companyName || companyId,
    page: page?.title || page?.interfaceId,
  });
}

function applyPagePrimary(
  focus: CopilotFocusState,
  ref: EntityRef,
): CopilotFocusState {
  if (focus.pinned || focus.cleared) return focus;
  if (focus.source === 'manual') return focus;
  if (
    sameEntity(focus.primary, ref) &&
    focus.primary?.label === ref.label
  ) {
    return focus;
  }
  // Keep the page primary (e.g. matching) when secondary keys (student, tutor) update.
  if (focus.primary && focus.primary.type !== ref.type) {
    return focus;
  }
  return {
    ...focus,
    primary: ref,
    recents: rememberRecent(focus.recents, ref),
  };
}

export const useApplicationContextStore = create<ApplicationContextState>()(
  persist(
    (set, get) => ({
      context: { locale: 'fr' },
      ui: emptyUi,
      focus: emptyFocus(),

      setPageContext: (page) =>
        set((state) => ({
          context: { ...state.context, page },
        })),

      setSelection: (primary, entities) =>
        set((state) => {
          const prev = state.context.selection;
          if (!primary) {
            if (!prev) return state;
            return {
              context: { ...state.context, selection: undefined },
            };
          }
          const decorated = decorate(primary, state.context.page);
          const nextEntities = (entities ?? [primary]).map((e) =>
            decorate(e, state.context.page),
          );
          if (
            prev?.primary?.id === decorated.id &&
            prev?.primary?.type === decorated.type &&
            prev?.primary?.label === decorated.label
          ) {
            return {
              focus: applyPagePrimary(state.focus, decorated),
            };
          }
          return {
            context: {
              ...state.context,
              selection: { primary: decorated, entities: nextEntities },
            },
            focus: applyPagePrimary(state.focus, decorated),
          };
        }),

      setFilters: (filters) =>
        set((state) => ({
          context: { ...state.context, filters },
        })),

      setEntity: (key, value) =>
        set((state) => {
          const prev = state.context[key];
          if (!value && !prev) return state;
          if (
            value &&
            prev &&
            typeof prev === 'object' &&
            'id' in prev &&
            prev.id === value.id &&
            prev.type === value.type &&
            prev.label === value.label
          ) {
            const decorated = decorate(value, state.context.page);
            return { focus: applyPagePrimary(state.focus, decorated) };
          }
          const decorated = value
            ? decorate(value, state.context.page)
            : undefined;
          let nextFocus = state.focus;
          if (decorated) {
            nextFocus = applyPagePrimary(state.focus, decorated);
          } else if (
            !state.focus.pinned &&
            state.focus.source === 'page' &&
            state.focus.primary &&
            entityKeyForType(state.focus.primary.type) === key
          ) {
            nextFocus = {
              ...state.focus,
              primary: undefined,
              extras: [],
            };
          }
          return {
            context: { ...state.context, [key]: decorated },
            focus: nextFocus,
          };
        }),

      patchContext: (partial) =>
        set((state) => ({
          context: { ...state.context, ...partial },
        })),

      clearSelection: () =>
        set((state) => {
          if (!state.context.selection) return state;
          return {
            context: {
              ...state.context,
              selection: undefined,
            },
          };
        }),

      onPageNavigated: () =>
        set((state) => {
          if (state.focus.pinned) return state;
          return {
            focus: {
              ...state.focus,
              source: 'page',
              cleared: false,
              primary: undefined,
              extras: [],
            },
          };
        }),

      setManualFocus: (ref) =>
        set((state) => {
          const decorated = decorate(ref, state.context.page);
          const key = entityKeyForType(decorated.type);
          return {
            focus: {
              ...state.focus,
              source: 'manual',
              cleared: false,
              primary: decorated,
              extras: (state.focus.extras ?? []).filter(
                (e) => !sameEntity(e, decorated),
              ),
              recents: rememberRecent(state.focus.recents, decorated),
            },
            context: key
              ? { ...state.context, [key]: decorated }
              : state.context,
          };
        }),

      toggleCompareEntity: (ref) =>
        set((state) => {
          const decorated = decorate(ref, state.context.page);
          const extras = state.focus.extras ?? [];
          const exists = extras.some((e) => sameEntity(e, decorated));
          const nextExtras = exists
            ? extras.filter((e) => !sameEntity(e, decorated))
            : [...extras, decorated].slice(0, 3);
          const primary = state.focus.primary ?? decorated;
          return {
            focus: {
              ...state.focus,
              cleared: false,
              source: state.focus.source === 'page' ? 'manual' : state.focus.source,
              primary,
              extras: nextExtras.filter((e) => !sameEntity(e, primary)),
              recents: rememberRecent(state.focus.recents, decorated),
            },
          };
        }),

      pinFocus: (pinned) =>
        set((state) => ({
          focus: {
            ...state.focus,
            pinned: pinned ?? !state.focus.pinned,
          },
        })),

      clearFocus: () =>
        set((state) => ({
          focus: {
            ...state.focus,
            pinned: false,
            source: 'manual',
            cleared: true,
            primary: undefined,
            extras: [],
          },
        })),

      openAssistant: (options) => {
        if (options?.context) {
          get().patchContext(options.context);
        }
        set((state) => {
          let nextFocus = state.focus;
          if (!state.focus.pinned) {
            const fromPage = pagePrimaryFromContext(state.context);
            if (fromPage) {
              const decorated = decorate(fromPage, state.context.page);
              nextFocus = {
                ...state.focus,
                source: 'page',
                cleared: false,
                primary: decorated,
                recents: rememberRecent(state.focus.recents, decorated),
              };
            }
          }
          return {
            focus: nextFocus,
            ui: {
              ...state.ui,
              open: true,
              docked: false,
              pendingPrompt: options?.prompt?.trim() || null,
              autoSendPending:
                options?.autoSend !== false && Boolean(options?.prompt?.trim()),
            },
          };
        });
      },

      closeAssistant: () =>
        set((state) => ({
          ui: { ...state.ui, open: false, maximized: false, docked: false },
        })),

      minimizeAssistant: () =>
        set((state) => ({
          ui: { ...state.ui, open: false, maximized: false, docked: true },
        })),

      restoreAssistant: () =>
        set((state) => ({
          ui: { ...state.ui, open: true, docked: false },
        })),

      setMaximized: (maximized) =>
        set((state) => ({
          ui: { ...state.ui, maximized },
        })),

      setPanelPosition: (position) =>
        set((state) => ({
          ui: { ...state.ui, position },
        })),

      consumePendingPrompt: () => {
        const { pendingPrompt, autoSendPending } = get().ui;
        if (!pendingPrompt) return null;
        set((state) => ({
          ui: {
            ...state.ui,
            pendingPrompt: null,
            autoSendPending: false,
          },
        }));
        return { prompt: pendingPrompt, autoSend: autoSendPending };
      },
    }),
    {
      name: 'ednov-copilot-ui',
      partialize: (state) => ({
        ui: {
          docked: state.ui.docked,
          maximized: state.ui.maximized,
          position: state.ui.position,
        },
        focus: {
          pinned: state.focus.pinned,
          source: state.focus.source,
          cleared: false,
          primary: state.focus.pinned ? state.focus.primary : undefined,
          extras: state.focus.pinned ? state.focus.extras : undefined,
          recents: state.focus.recents,
        },
      }),
      merge: (persisted, current) => {
        const p = persisted as {
          ui?: {
            docked?: boolean;
            maximized?: boolean;
            position?: { right: number; bottom: number };
          };
          focus?: Partial<CopilotFocusState>;
        } | undefined;
        return {
          ...current,
          ui: {
            ...current.ui,
            docked: Boolean(p?.ui?.docked),
            maximized: Boolean(p?.ui?.maximized),
            position: p?.ui?.position ?? current.ui.position,
          },
          focus: {
            ...current.focus,
            pinned: Boolean(p?.focus?.pinned),
            source: p?.focus?.source === 'manual' ? 'manual' : 'page',
            recents: Array.isArray(p?.focus?.recents) ? p!.focus!.recents! : [],
            primary: p?.focus?.pinned ? p.focus?.primary : current.focus.primary,
            extras: p?.focus?.pinned ? p.focus?.extras : current.focus.extras,
          },
        };
      },
    },
  ),
);
