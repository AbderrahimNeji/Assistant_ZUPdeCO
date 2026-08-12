/**
 * Background sync task — runs even when the app is suspended or removed from active apps.
 * Reads the offline queue from AsyncStorage, processes each item against the API,
 * and writes the remaining (failed) items back to AsyncStorage.
 *
 * Registration: call registerBackgroundSync() once at app startup.
 * Note: expo-background-fetch is native-only; all exports are no-ops on web.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitCompteRendu, updateSessionReport } from '@/services/comptesRendus';
import { updateSessionParticipant } from '@/services/sessions';
import { isNetworkError } from '@/utils/networkError';
import type { SubmitCompteRenduPayload } from '@/services/comptesRendus';
import type { CrUpdatePayload, OfflineQueueItem } from '@/store/offlineQueueStore';
import type { AttendanceStatus } from '@/types/session';

const TASK_NAME = 'ednov-offline-sync';
const OFFLINE_QUEUE_STORAGE_KEY = 'ednov_offline_queue';

type BgProcessResult = 'success' | 'network_error' | 'server_error';

/** Process a single queued item directly (no React context).
 *  Returns 'network_error' to keep item in queue, 'server_error' to discard it. */
async function processQueueItem(item: OfflineQueueItem): Promise<BgProcessResult> {
  try {
    if (item.type === 'cr_submit') {
      const p = item.payload as SubmitCompteRenduPayload;
      await submitCompteRendu(p);
      return 'success';
    }
    if (item.type === 'cr_update') {
      const p = item.payload as CrUpdatePayload;
      await updateSessionReport(p.sessionId, p.reportId, {
        authorFeedbacks: p.authorFeedbacks,
        subjectIds: p.matiereIds,
        status: 'submitted',
        ...(p.participants?.length ? { participants: p.participants } : {}),
      });
      return 'success';
    }
    if (item.type === 'attendance_update') {
      const p = item.payload as {
        sessionId: string;
        participantId: string;
        attendanceStatus: AttendanceStatus;
        absenceJustification?: string | null;
        absenceComment?: string | null;
      };
      await updateSessionParticipant(p.sessionId, p.participantId, {
        attendanceStatus: p.attendanceStatus,
        ...(p.absenceJustification !== undefined && { absenceJustification: p.absenceJustification }),
        ...(p.absenceComment !== undefined && { absenceComment: p.absenceComment }),
      });
      return 'success';
    }
    // Unknown type — discard so it doesn't block the queue
    return 'server_error';
  } catch (err) {
    if (isNetworkError(err)) return 'network_error';
    // 4xx / 5xx / validation error — non-retriable, discard
    return 'server_error';
  }
}

// Register the background task at module level (native only).
// This file must be imported early so the task definition is available before registration.
if (Platform.OS !== 'web') {
  // Dynamic require keeps web bundle clean (expo-background-fetch is native-only).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BackgroundFetch = require('expo-background-fetch') as typeof import('expo-background-fetch');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');

  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

      const stored = JSON.parse(raw) as { state?: { queue?: OfflineQueueItem[] }; version?: number };
      const queue: OfflineQueueItem[] = stored?.state?.queue ?? [];
      if (queue.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

      // Process all items: success → mark for removal, network_error → keep, server_error → discard.
      const successIds = new Set<string>();
      const discardIds = new Set<string>();
      for (const item of queue) {
        const result = await processQueueItem(item);
        if (result === 'success') successIds.add(item.id);
        else if (result === 'server_error') discardIds.add(item.id);
        // network_error → keep as-is for the next background attempt
      }

      if (successIds.size === 0 && discardIds.size === 0) {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      // Re-read AsyncStorage before writing back: the foreground JS thread may have
      // enqueued new items or already removed some while this task was running.
      // Only remove the ids we successfully processed — preserve everything else.
      const freshRaw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      const freshStored = freshRaw
        ? (JSON.parse(freshRaw) as typeof stored)
        : stored;
      const freshQueue: OfflineQueueItem[] = freshStored?.state?.queue ?? [];
      const finalQueue = freshQueue.filter((item) => !successIds.has(item.id) && !discardIds.has(item.id));

      await AsyncStorage.setItem(
        OFFLINE_QUEUE_STORAGE_KEY,
        JSON.stringify({ ...freshStored, state: { ...(freshStored?.state ?? {}), queue: finalQueue } })
      );

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/** Register the background sync task. No-op on web. Safe to call multiple times. */
export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // Dynamic require keeps web bundle clean.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundFetch = require('expo-background-fetch') as typeof import('expo-background-fetch');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');

    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes (OS may defer)
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    // Background fetch registration is best-effort; silently ignore errors.
  }
}
