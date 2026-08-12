import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { submitCompteRendu, updateSessionReport } from '@/services/comptesRendus';
import { updateSessionParticipant } from '@/services/sessions';
import {
  useOfflineQueueStore,
  isCrSubmitPayload,
  isCrUpdatePayload,
  type OfflineQueueItem,
  type CrUpdatePayload,
} from '@/store/offlineQueueStore';
import type { SubmitCompteRenduPayload } from '@/services/comptesRendus';
import type { AttendanceStatus } from '@/types/session';
import { useNetworkStatus } from './useNetworkStatus';
import { isNetworkError } from '@/utils/networkError';

export type SyncMessage = { type: 'success'; text: string } | { type: 'error'; text: string } | null;

type ProcessResult = 'success' | 'network_error' | 'server_error';

/** Process one queued item: call API and invalidate relevant queries.
 *  Returns:
 *   - 'success'      → remove from queue, continue
 *   - 'network_error'→ item stays, stop flush (will retry on next online event)
 *   - 'server_error' → item is non-retriable (4xx/5xx), discard and continue */
async function processItem(
  item: OfflineQueueItem,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<ProcessResult> {
  try {
    if (item.type === 'cr_submit' && isCrSubmitPayload(item.payload)) {
      const payload: SubmitCompteRenduPayload = item.payload;
      await submitCompteRendu(payload);
      queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'report-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      return 'success';
    }
    if (item.type === 'cr_update' && isCrUpdatePayload(item.payload)) {
      const p = item.payload as CrUpdatePayload;
      await updateSessionReport(p.sessionId, p.reportId, {
        authorFeedbacks: p.authorFeedbacks,
        subjectIds: p.matiereIds,
        status: 'submitted',
        ...(p.participants?.length ? { participants: p.participants } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['comptes-rendus'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', p.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'report-kpis'] });
      return 'success';
    }
    if (item.type === 'attendance_update' && 'participantId' in item.payload && 'attendanceStatus' in item.payload) {
      const { sessionId, participantId, attendanceStatus, absenceJustification, absenceComment } = item.payload as {
        sessionId: string;
        participantId: string;
        attendanceStatus: AttendanceStatus;
        absenceJustification?: string | null;
        absenceComment?: string | null;
      };
      await updateSessionParticipant(sessionId, participantId, {
        attendanceStatus,
        ...(absenceJustification !== undefined && { absenceJustification }),
        ...(absenceComment !== undefined && { absenceComment }),
      });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      return 'success';
    }
    // Unknown item type — treat as server error so it doesn't block the queue indefinitely
    return 'server_error';
  } catch (err) {
    if (isNetworkError(err)) return 'network_error';
    // 4xx / 5xx / validation errors — non-retriable, discard the item
    if (__DEV__) console.warn('[OfflineSync] Non-retriable error for item', item.id, item.type, err);
    return 'server_error';
  }
}

/**
 * Processes the offline queue in order and returns a sync message.
 * Sync is triggered on three occasions:
 *   1. Offline → online transition while app is running
 *   2. App startup with pending items and an active network
 *   3. App comes back to the foreground (AppState 'active')
 */
export function useOfflineSync(): {
  syncMessage: SyncMessage;
  clearSyncMessage: () => void;
  pendingCount: number;
} {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const wasOfflineRef = useRef(false);
  const isSyncingRef = useRef(false);
  const startupSyncedRef = useRef(false);
  const [syncMessage, setSyncMessage] = useState<SyncMessage>(null);
  const queue = useOfflineQueueStore((s) => s.queue);
  const hasQueueRehydrated = useOfflineQueueStore((s) => s._hasRehydrated);
  const removeFromQueue = useOfflineQueueStore((s) => s.remove);

  const clearSyncMessage = useCallback(() => setSyncMessage(null), []);

  const runFlush = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    let synced = 0;
    let networkFailed = 0;
    let discarded = 0;
    try {
      while (true) {
        // Peek at the current queue without removing — only remove after confirmed success.
        const currentQueue = useOfflineQueueStore.getState().queue;
        const item = currentQueue[0] ?? null;
        if (!item) break;
        const result = await processItem(item, queryClient);
        if (result === 'success') {
          removeFromQueue(item.id);
          synced++;
        } else if (result === 'server_error') {
          // Non-retriable (4xx/5xx/unknown type) — discard and continue to next item.
          removeFromQueue(item.id);
          discarded++;
        } else {
          // Network error — stop and retry on the next online event.
          networkFailed++;
          break;
        }
      }
    } finally {
      isSyncingRef.current = false;
    }
    if (synced > 0 && networkFailed === 0) {
      const extra = discarded > 0 ? ` (${discarded} ignorée(s))` : '';
      setSyncMessage({
        type: 'success',
        text: (synced === 1 ? 'Synchronisation terminée' : `${synced} action(s) synchronisée(s)`) + extra,
      });
    } else if (networkFailed > 0) {
      setSyncMessage({
        type: 'error',
        text: synced > 0
          ? `${synced} synchronisée(s), erreur réseau sur 1 action`
          : 'Erreur de synchronisation — réessai à la prochaine connexion',
      });
    }
  }, [queryClient, removeFromQueue]);

  // 1. Offline → online transition
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;
    if (!wasOffline || isOffline) return;
    runFlush();
  }, [isOffline, runFlush]);

  // 2. Startup sync — runs once after Zustand queue rehydration, when online with pending items
  useEffect(() => {
    if (startupSyncedRef.current) return;
    if (!hasQueueRehydrated) return; // wait for AsyncStorage rehydration before trusting queue.length
    if (isOffline) return;
    if (queue.length === 0) return;
    startupSyncedRef.current = true;
    runFlush();
  }, [isOffline, queue.length, hasQueueRehydrated, runFlush]);

  // 3. AppState foreground — sync when the app comes back to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !isOffline) {
        runFlush();
      }
    });
    return () => subscription.remove();
  }, [isOffline, runFlush]);

  return {
    syncMessage,
    clearSyncMessage,
    pendingCount: queue.length,
  };
}
