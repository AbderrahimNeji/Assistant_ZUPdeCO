import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/config/firebase';
import { getApiV1BaseUrlFromEnv } from '@/lib/apiBaseUrl';

const RETRY_BASE_MS = 2_000;
const RETRY_CAP_MS = 30_000;
const NO_USER_RETRY_MS = 5_000;
const TOKEN_REFRESH_MS = 50 * 60 * 1_000;

/**
 * Opens an SSE stream to `/api/v1/notifications/stream` and invalidates the notifications
 * queries whenever a `notification.*` event is received.
 *
 * Native `EventSource` cannot set headers, so the Firebase ID token is passed as a `?token=`
 * query parameter. The backend `FirebaseJwtGuard` accepts both. The connection is rebuilt
 * ~50 minutes after each successful open to pick up a fresh token (Firebase tokens expire
 * at 60 min).
 */
export function useNotificationsStream(enabled = true): void {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = RETRY_BASE_MS;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };

    const connect = async () => {
      if (disposed) return;
      clearTimer();

      const user = auth.currentUser;
      if (!user) {
        timer = setTimeout(connect, NO_USER_RETRY_MS);
        return;
      }

      let token: string;
      try {
        token = await user.getIdToken();
      } catch (err) {
        console.warn('[notifications-stream] getIdToken failed', err);
        timer = setTimeout(connect, NO_USER_RETRY_MS);
        return;
      }

      const base = getApiV1BaseUrlFromEnv(import.meta.env.VITE_API_URL);
      if (!base) {
        console.warn('[notifications-stream] VITE_API_URL is empty; cannot open SSE');
        return;
      }

      es?.close();
      es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(token)}`, {
        withCredentials: false,
      });

      es.addEventListener('notification.created', invalidate);
      es.addEventListener('notification.read', invalidate);
      es.addEventListener('notification.read_all', invalidate);

      es.onopen = () => {
        retryDelay = RETRY_BASE_MS;
        clearTimer();
        timer = setTimeout(connect, TOKEN_REFRESH_MS);
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (disposed) return;
        clearTimer();
        timer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RETRY_CAP_MS);
      };
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    void connect();

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimer();
      es?.close();
      es = null;
    };
    // queryClient is stable; avoid re-running the effect and opening duplicate EventSources
  }, [enabled]);
}
