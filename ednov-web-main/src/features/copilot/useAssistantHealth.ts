import * as React from 'react';

import { getAssistantApiOrigin } from './copilot.api';
import { backoffDelay, sleep } from './errors';

export type AssistantHealthStatus = 'unknown' | 'ok' | 'down' | 'checking';

const POLL_OK_MS = 15_000;
const POLL_DOWN_MS = 5_000;

/**
 * Polls GET {ASSISTANT_API}/health (no auth) and exposes a green/red status.
 * Auto-retries with backoff while down.
 */
export function useAssistantHealth(enabled = true) {
  const [status, setStatus] = React.useState<AssistantHealthStatus>('unknown');
  const [lastCheckedAt, setLastCheckedAt] = React.useState<number | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = React.useState(0);
  const attemptRef = React.useRef(0);

  const check = React.useCallback(async (signal?: AbortSignal) => {
    setStatus((prev) => (prev === 'ok' ? prev : 'checking'));
    const origin = getAssistantApiOrigin();
    try {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);
      const timeout = window.setTimeout(() => controller.abort(), 4_000);
      try {
        const res = await fetch(`${origin}/api/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`health ${res.status}`);
        const body = (await res.json().catch(() => null)) as
          | { status?: string }
          | null;
        const ok =
          res.ok &&
          (!body?.status ||
            body.status === 'ok' ||
            body.status === 'healthy' ||
            body.status === 'up');
        if (!ok) throw new Error('unhealthy');
        attemptRef.current = 0;
        setConsecutiveFailures(0);
        setStatus('ok');
        setLastCheckedAt(Date.now());
        return true;
      } finally {
        window.clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
      }
    } catch {
      attemptRef.current += 1;
      setConsecutiveFailures((n) => n + 1);
      setStatus('down');
      setLastCheckedAt(Date.now());
      return false;
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    let timer: number | undefined;
    let cancelled = false;

    const loop = async () => {
      const ok = await check(abort.signal);
      if (cancelled || abort.signal.aborted) return;
      const delay = ok
        ? POLL_OK_MS
        : Math.min(POLL_DOWN_MS + backoffDelay(attemptRef.current - 1), 12_000);
      timer = window.setTimeout(() => {
        void loop();
      }, delay);
    };

    void loop();
    return () => {
      cancelled = true;
      abort.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, check]);

  const retryNow = React.useCallback(async () => {
    await sleep(0);
    return check();
  }, [check]);

  return {
    status,
    lastCheckedAt,
    consecutiveFailures,
    retryNow,
    isOnline: status === 'ok',
  };
}
