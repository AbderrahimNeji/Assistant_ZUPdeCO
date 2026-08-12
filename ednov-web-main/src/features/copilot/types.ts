export type EntityRef = {
  type: string;
  id: string;
  label?: string;
  /** Company display name or id — never used for authorization. */
  company?: string;
  /** Entity role (student, tutor, …) when known. */
  role?: string;
  /** Page title where this entity was focused. */
  page?: string;
};

export type CopilotFocusState = {
  pinned: boolean;
  source: 'page' | 'manual';
  /** Global mode — ignore page entities until a new selection. */
  cleared: boolean;
  primary?: EntityRef;
  /** Extra entities for “compare these two …”. */
  extras?: EntityRef[];
  recents: EntityRef[];
};

export type ApplicationContext = {
  page?: {
    route?: string;
    interfaceId?: string;
    title?: string;
  };
  selection?: {
    primary?: EntityRef;
    entities?: EntityRef[];
  };
  /** Active list/search filters on the current page (ids ok — redacted in prompts). */
  filters?: Record<string, unknown>;
  /** Free-text search box value from the current page. */
  search?: string;
  /** Focused calendar / report date (ISO yyyy-mm-dd) or inclusive range. */
  date?: { start?: string; end?: string; label?: string };
  program?: EntityRef;
  session?: EntityRef;
  student?: EntityRef;
  tutor?: EntityRef;
  document?: EntityRef;
  course?: EntityRef;
  benchmark?: EntityRef;
  establishment?: EntityRef;
  matching?: EntityRef;
  report?: EntityRef;
  parent?: EntityRef;
  user?: EntityRef;
  company?: EntityRef;
  locale?: string;
  /** Resolved Copilot focus (page vs pinned vs global). */
  focus?: {
    pinned?: boolean;
    source?: 'page' | 'manual';
    scope?: 'entity' | 'comparison' | 'global';
  };
};

export type OpenAssistantOptions = {
  prompt?: string;
  /** Merged into current context for this launch (does not wipe page context). */
  context?: Partial<ApplicationContext>;
  /** When true (default), auto-send the prompt. */
  autoSend?: boolean;
};

export type CopilotUiState = {
  open: boolean;
  docked: boolean;
  maximized: boolean;
  /** Floating panel offset from bottom-right corner (px). */
  position?: { right: number; bottom: number };
  pendingPrompt: string | null;
  autoSendPending: boolean;
};
