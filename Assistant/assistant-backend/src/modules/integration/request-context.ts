import { AsyncLocalStorage } from 'async_hooks';

/**
 * Page / selection context sent by the Ednov Copilot UI on each chat turn.
 * Consumed by adapters and knowledge providers via RequestContextStore.
 * Never trusted for authorization — adapters always re-fetch via Ednov APIs.
 */
export type EntityRef = {
  type: string;
  id: string;
  label?: string;
  company?: string;
  role?: string;
  page?: string;
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
  focus?: {
    pinned?: boolean;
    source?: 'page' | 'manual';
    scope?: 'entity' | 'comparison' | 'global';
  };
};

export type RequestContextState = {
  /** Firebase ID token (or local JWT when AUTH_MODE=local) for Ednov API calls. */
  accessToken?: string;
  /** Auth mode that authenticated this request. */
  authMode?: 'firebase' | 'local';
  /** Ednov user id when authenticated via Firebase. */
  ednovUserId?: string;
  /** Ednov company UUID — used to rewrite `/companies/current` like the web client. */
  ednovCompanyId?: string;
  firebaseUid?: string;
  applicationContext?: ApplicationContext | null;
};

const storage = new AsyncLocalStorage<RequestContextState>();

export class RequestContextStore {
  static run<T>(state: RequestContextState, fn: () => T): T {
    return storage.run({ ...state }, fn);
  }

  static getStore(): RequestContextState | undefined {
    return storage.getStore();
  }

  static getAccessToken(): string | undefined {
    return storage.getStore()?.accessToken;
  }

  static getEdnovCompanyId(): string | undefined {
    return storage.getStore()?.ednovCompanyId;
  }

  static setAccessToken(token: string): void {
    const store = storage.getStore();
    if (store) {
      store.accessToken = token;
    }
  }

  static getApplicationContext(): ApplicationContext | null | undefined {
    return storage.getStore()?.applicationContext;
  }

  static setApplicationContext(ctx: ApplicationContext | null | undefined): void {
    const store = storage.getStore();
    if (store) {
      store.applicationContext = ctx ?? null;
    }
  }

  static patch(partial: Partial<RequestContextState>): void {
    const store = storage.getStore();
    if (!store) return;
    Object.assign(store, partial);
  }
}

export function getAuthMode(): 'firebase' | 'local' {
  const mode = (process.env.AUTH_MODE ?? 'local').trim().toLowerCase();
  return mode === 'firebase' ? 'firebase' : 'local';
}

/** Prefer Ednov-backed application data when Firebase auth or explicit flag is set. */
export function isEdnovDataSource(): boolean {
  const flag = (process.env.APPLICATION_DATA_SOURCE ?? '').trim().toLowerCase();
  if (flag === 'ednov') return true;
  if (flag === 'prisma') return false;
  return getAuthMode() === 'firebase';
}
