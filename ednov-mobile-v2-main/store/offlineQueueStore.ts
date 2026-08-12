import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubmitCompteRenduPayload } from '@/services/comptesRendus';
import type { AttendanceStatus } from '@/types/session';
import type { CompteRenduAuthorFeedback } from '@/types/compteRendu';
import type { SessionReportParticipantAttendanceItem } from '@/utils/sessionReportParticipants';

const OFFLINE_QUEUE_STORAGE_KEY = 'ednov_offline_queue';
const MAX_QUEUE_SIZE = 50;

export type OfflineQueueItemType = 'cr_submit' | 'attendance_update' | 'cr_update';

export interface CrSubmitPayload {
  sessionId: string;
  matiereIds: string[];
  authorId?: string | null;
  reportId?: string | null;
  authorFeedbacks?: CompteRenduAuthorFeedback[];
  /** Legacy mono-auteur */
  note?: string;
  commentaire?: string;
  feeling?: import('@/types/compteRendu').CompteRenduFeeling | null;
  participants?: SessionReportParticipantAttendanceItem[];
}

/** Payload for editing an existing CR while offline. */
export interface CrUpdatePayload {
  reportId: string;
  sessionId: string;
  matiereIds: string[];
  authorFeedbacks: CompteRenduAuthorFeedback[];
  participants?: SessionReportParticipantAttendanceItem[];
}

export interface AttendanceUpdatePayload {
  sessionId: string;
  participantId: string;
  attendanceStatus: AttendanceStatus;
  absenceJustification?: string | null;
  absenceComment?: string | null;
}

export type OfflineQueueItemPayload = CrSubmitPayload | CrUpdatePayload | AttendanceUpdatePayload;

export interface OfflineQueueItem {
  id: string;
  type: OfflineQueueItemType;
  payload: OfflineQueueItemPayload;
  createdAt: string;
}

type PersistedState = { queue: OfflineQueueItem[] };

interface OfflineQueueState {
  queue: OfflineQueueItem[];
  _hasRehydrated: boolean;
  enqueue: (item: Omit<OfflineQueueItem, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

function createId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],
      _hasRehydrated: false,
      enqueue: (item) => {
        set((state) => {
          const list = [...state.queue];
          if (list.length >= MAX_QUEUE_SIZE) {
            if (__DEV__) console.warn('[OfflineQueue] Queue full — oldest item discarded to make room');
            list.shift();
          }
          list.push({
            id: createId(),
            type: item.type,
            payload: item.payload,
            createdAt: new Date().toISOString(),
          });
          return { queue: list };
        });
      },
      remove: (id) => {
        set((state) => ({
          queue: state.queue.filter((x) => x.id !== id),
        }));
      },
      clear: () => set({ queue: [] }),
    }),
    {
      name: OFFLINE_QUEUE_STORAGE_KEY,
      partialize: (state) => ({ queue: state.queue } as PersistedState),
      merge: (persisted, current) => {
        const raw = persisted as PersistedState | null | undefined;
        const queue = Array.isArray(raw?.queue) ? raw.queue : current.queue;
        return { ...current, queue };
      },
      onRehydrateStorage: () => (_rehydratedState, error) => {
        useOfflineQueueStore.setState({ _hasRehydrated: true });
        if (__DEV__ && error) console.warn('[OfflineQueue] Rehydration error:', error);
      },
      storage: {
        getItem: async (name) => {
          try {
            const raw = await AsyncStorage.getItem(name);
            return raw == null ? null : (JSON.parse(raw) as { state: PersistedState; version?: number });
          } catch {
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch {
            // ignore
          }
        },
        removeItem: async (name) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch {
            // ignore
          }
        },
      },
    }
  )
);

/** Type guard for CR submit payload. */
export function isCrSubmitPayload(
  p: OfflineQueueItemPayload
): p is SubmitCompteRenduPayload {
  return (
    'sessionId' in p &&
    'matiereIds' in p &&
    Array.isArray((p as SubmitCompteRenduPayload).matiereIds)
  );
}

/** Type guard for CR update payload. Primarily used after an item.type === 'cr_update' check. */
export function isCrUpdatePayload(
  p: OfflineQueueItemPayload
): p is CrUpdatePayload {
  return (
    'reportId' in p &&
    'sessionId' in p &&
    typeof (p as CrUpdatePayload).reportId === 'string' &&
    (p as CrUpdatePayload).reportId.length > 0
  );
}
