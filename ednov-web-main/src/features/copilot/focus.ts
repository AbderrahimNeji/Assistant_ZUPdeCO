import type { ApplicationContext, CopilotFocusState, EntityRef } from './types';

export const FOCUS_ENTITY_KEYS = [
  'student',
  'tutor',
  'session',
  'report',
  'establishment',
  'program',
  'company',
  'matching',
  'document',
  'parent',
  'user',
  'course',
] as const;

export type FocusEntityKey = (typeof FOCUS_ENTITY_KEYS)[number];

export const emptyFocus = (): CopilotFocusState => ({
  pinned: false,
  source: 'page',
  cleared: false,
  recents: [],
});

export function entityKeyForType(type: string): FocusEntityKey | null {
  const normalized = type.toLowerCase();
  if ((FOCUS_ENTITY_KEYS as readonly string[]).includes(normalized)) {
    return normalized as FocusEntityKey;
  }
  return null;
}

export function decorateEntity(
  ref: EntityRef,
  extras?: { company?: string; page?: string },
): EntityRef {
  return {
    ...ref,
    label: ref.label?.trim() || ref.type,
    company: ref.company || extras?.company,
    role: ref.role || ref.type,
    page: ref.page || extras?.page,
  };
}

export function sameEntity(a?: EntityRef | null, b?: EntityRef | null): boolean {
  if (!a || !b) return false;
  return a.type === b.type && a.id === b.id;
}

export function rememberRecent(
  recents: EntityRef[],
  ref: EntityRef,
  limit = 8,
): EntityRef[] {
  const next = [ref, ...recents.filter((r) => !sameEntity(r, ref))];
  return next.slice(0, limit);
}

export function pageEntities(context: ApplicationContext): EntityRef[] {
  const out: EntityRef[] = [];
  const seen = new Set<string>();
  const push = (ref?: EntityRef) => {
    if (!ref?.id) return;
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ref);
  };
  push(context.selection?.primary);
  for (const ref of context.selection?.entities ?? []) push(ref);
  for (const key of FOCUS_ENTITY_KEYS) push(context[key]);
  return out;
}

/** Best page entity to bind when opening Ask Copilot. */
export function pagePrimaryFromContext(
  context: ApplicationContext,
): EntityRef | undefined {
  return (
    context.selection?.primary ||
    context.student ||
    context.tutor ||
    context.session ||
    context.report ||
    context.establishment ||
    context.program ||
    context.matching
  );
}

export function conversationScope(
  focus: CopilotFocusState,
): 'global' | 'entity' | 'comparison' {
  if (focus.cleared || !focus.primary) return 'global';
  if ((focus.extras?.length ?? 0) > 0) return 'comparison';
  return 'entity';
}

/**
 * Context sent to the Assistant API: page filters stay, but the focused
 * entity (pinned / manual / page) wins for pronouns and skills.
 */
export function buildOutboundContext(
  pageContext: ApplicationContext,
  focus: CopilotFocusState,
): ApplicationContext {
  const scope = conversationScope(focus);
  const base: ApplicationContext = {
    ...pageContext,
    focus: {
      pinned: focus.pinned,
      source: focus.source,
      scope,
    },
  };

  if (scope === 'global') {
    const stripped: ApplicationContext = {
      page: base.page,
      filters: base.filters,
      search: base.search,
      date: base.date,
      locale: base.locale,
      company: base.company,
      focus: base.focus,
    };
    return stripped;
  }

  const primary = focus.primary!;
  const extras = focus.extras ?? [];
  const key = entityKeyForType(primary.type);
  const entities = [primary, ...extras.filter((e) => !sameEntity(e, primary))];

  const next: ApplicationContext = {
    ...base,
    selection: {
      primary,
      entities,
    },
  };

  if (key) {
    next[key] = primary;
  }

  return next;
}

export function focusBadgeLabel(ref: EntityRef): string {
  return ref.label?.trim() || ref.type;
}

export function focusTypeLabel(type: string): string {
  switch (type) {
    case 'student':
      return 'Élève';
    case 'tutor':
      return 'Tuteur';
    case 'session':
      return 'Séance';
    case 'report':
      return 'Compte-rendu';
    case 'establishment':
      return 'Établissement';
    case 'program':
      return 'Programme';
    case 'company':
      return 'Organisation';
    case 'matching':
      return 'Binôme';
    default:
      return type;
  }
}
