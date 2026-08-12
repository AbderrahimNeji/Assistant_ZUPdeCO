import { Logger } from '@nestjs/common';

import { RequestContextStore } from '../integration/request-context';

const logger = new Logger('SkillResilience');

const ATTEMPT_TIMEOUT_MS = 3_200;
const PROFILE_TTL_MS = 60_000;

export type SoftResult<T> = {
  ok: boolean;
  data: T | null;
  warning?: string;
  timedOut?: boolean;
  retried?: boolean;
  durationMs: number;
  fallback?: string;
  status?: number;
  forbidden?: boolean;
};

type CacheEntry = { data: unknown; at: number };

const profileCache = new Map<string, CacheEntry>();

function cacheScope(): string {
  return RequestContextStore.getStore()?.ednovUserId ?? 'anon';
}

export function rememberProfile(entityKey: string, data: unknown): void {
  profileCache.set(`${cacheScope()}:${entityKey}`, {
    data,
    at: Date.now(),
  });
}

export function recallProfile<T>(entityKey: string): T | null {
  const hit = profileCache.get(`${cacheScope()}:${entityKey}`);
  if (!hit) return null;
  if (Date.now() - hit.at > PROFILE_TTL_MS) {
    profileCache.delete(`${cacheScope()}:${entityKey}`);
    return null;
  }
  return hit.data as T;
}

export function isTimeoutError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return /timeout|timed out|etimedout|econnreset|econnaborted/i.test(message);
}

function httpStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'getStatus' in error &&
    typeof (error as { getStatus?: () => number }).getStatus === 'function'
  ) {
    return (error as { getStatus: () => number }).getStatus();
  }
  return undefined;
}

function isRetryable(error: unknown): boolean {
  if (isTimeoutError(error)) return true;
  const status = httpStatus(error);
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }
  return true;
}

function userSafeWarning(label: string, timedOut?: boolean): string {
  return timedOut
    ? `${label} could not be retrieved in time — answering with partial live data.`
    : `${label} could not be retrieved — answering with partial live data.`;
}

function withAttemptTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * One retry on timeout/transient errors. Never throws — skills keep going
 * with partial facts. Logs duration/retry/timeout without user-facing IDs.
 */
export async function softCall<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { retries?: number; timeoutMs?: number },
): Promise<SoftResult<T>> {
  const retries = options?.retries ?? 1;
  const timeoutMs = options?.timeoutMs ?? ATTEMPT_TIMEOUT_MS;
  const started = performance.now();
  let retried = false;
  let lastTimedOut = false;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) retried = true;
    const t0 = performance.now();
    try {
      const data = await withAttemptTimeout(fn, timeoutMs);
      const durationMs = Math.round(performance.now() - t0);
      logger.debug(
        `api="${label}" durationMs=${durationMs} retry=${retried} timeout=false ok=true`,
      );
      return {
        ok: true,
        data,
        retried,
        durationMs: Math.round(performance.now() - started),
      };
    } catch (error) {
      lastTimedOut = isTimeoutError(error);
      const durationMs = Math.round(performance.now() - t0);
      logger.warn(
        `api="${label}" durationMs=${durationMs} retry=${retried} timeout=${lastTimedOut} ok=false`,
      );
      if (attempt < retries && isRetryable(error)) continue;
      const status = httpStatus(error);
      return {
        ok: false,
        data: null,
        warning: userSafeWarning(label, lastTimedOut),
        timedOut: lastTimedOut,
        retried,
        durationMs: Math.round(performance.now() - started),
        status,
        forbidden: status === 403,
      };
    }
  }

  return {
    ok: false,
    data: null,
    warning: userSafeWarning(label, lastTimedOut),
    timedOut: lastTimedOut,
    retried,
    durationMs: Math.round(performance.now() - started),
  };
}

export function logFallback(label: string, fallback: string): void {
  logger.warn(`api="${label}" fallback="${fallback}" retry=n/a timeout=n/a`);
}

export function collectWarnings(
  ...results: Array<SoftResult<unknown> | string | undefined | null>
): string[] {
  const out: string[] = [];
  for (const item of results) {
    if (!item) continue;
    if (typeof item === 'string') {
      out.push(item);
      continue;
    }
    if (!item.ok && item.warning) out.push(item.warning);
  }
  return out;
}

export function ambiguousEntityFacts(kind: 'student' | 'tutor' | 'session'): string[] {
  const label =
    kind === 'student' ? 'student' : kind === 'tutor' ? 'tutor' : 'session';
  return [
    `DIRECT ANSWER: No ${label} is selected and no name was given — please name the ${label} or select them on the current Ednov page.`,
    'EXPLANATION: Copilot uses page selection first, then live search. It will not guess an identity.',
    'BUSINESS REASONING: An ambiguous question is not a missing-document case; ask for the entity instead of refusing.',
    `NEXT ACTION: Open the ${label} row in Ednov, or type their name.`,
    'SOURCE: page context / GET /search/global',
    'Do not reply that the information was not found in documents.',
  ];
}
