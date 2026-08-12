import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { updateSessionParticipant } from '@/services/sessions';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { AttendanceStatus, SessionParticipant } from '@/types/session';
import { isNetworkError } from '@/utils/networkError';

function getResponseStatus(error: unknown): number | undefined {
  if (error != null && typeof error === 'object' && 'status' in error) {
    const s = (error as { status?: number }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

export type UseUpdateAttendanceOptions = {
  onSessionEndedError?: () => void;
  onSaved?: (
    participantId: string,
    payload: { absenceJustification: string; absenceComment: string },
  ) => void;
  /** Called after each mutation settles so the UI can flush pending local drafts. */
  onSettled?: (participantId: string) => void;
};

export function useUpdateAttendance(
  sessionId: string | undefined,
  options?: UseUpdateAttendanceOptions,
) {
  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const { isOffline } = useNetworkStatus();
  const latestRequestSeqRef = useRef(0);

  return useMutation({
    mutationKey: ['updateAttendance', sessionId],
    // Always run — offline path is handled inside mutationFn (proactive enqueue + optimistic resolve).
    // Without this, TanStack Query pauses the mutation when onlineManager is offline and isPending
    // stays true forever, blocking the UI.
    networkMode: 'always',
    onMutate: async (variables) => {
      if (!sessionId) return undefined;
      const requestSeq = ++latestRequestSeqRef.current;
      await queryClient.cancelQueries({ queryKey: ['session', sessionId, 'participants'] });
      const previous = queryClient.getQueryData<SessionParticipant[]>([
        'session',
        sessionId,
        'participants',
      ]);
      queryClient.setQueryData<SessionParticipant[]>(
        ['session', sessionId, 'participants'],
        (prev) => {
          if (!prev) return prev;
          return prev.map((p) =>
            p.id === variables.participantId
              ? {
                  ...p,
                  attendanceStatus: variables.attendanceStatus,
                  absenceJustification:
                    variables.absenceJustification !== undefined
                      ? (variables.absenceJustification ?? undefined)
                      : p.absenceJustification,
                  absenceComment:
                    variables.absenceComment !== undefined
                      ? (variables.absenceComment ?? undefined)
                      : p.absenceComment,
                }
              : p,
          );
        },
      );
      return { previous, requestSeq };
    },
    mutationFn: ({
      participantId,
      attendanceStatus,
      absenceJustification,
      absenceComment,
    }: {
      participantId: string;
      attendanceStatus: AttendanceStatus;
      absenceJustification?: string | null;
      absenceComment?: string | null;
    }) => {
      if (attendanceStatus === 'absent') {
        const justification = (absenceJustification ?? '').trim();
        if (!justification) {
          return Promise.reject(new Error("Un motif d'absence est requis"));
        }
      }

      // Proactive offline path: enqueue directly without attempting the API call,
      // mirroring the CR submission offline path in new.tsx. This avoids relying
      // on network error detection and prevents showing an error message to the user.
      if (isOffline && sessionId) {
        enqueue({
          type: 'attendance_update',
          payload: {
            sessionId,
            participantId,
            attendanceStatus,
            ...(absenceJustification !== undefined && { absenceJustification }),
            ...(absenceComment !== undefined && { absenceComment }),
          },
        });
        // Build an optimistic participant so onSuccess fires and the cache
        // reflects the new values immediately without showing an error.
        const currentParticipants =
          queryClient.getQueryData<SessionParticipant[]>([
            'session',
            sessionId,
            'participants',
          ]) ?? [];
        const existing = currentParticipants.find((p) => p.id === participantId);
        return Promise.resolve<SessionParticipant>({
          id: participantId,
          sessionId,
          userId: existing?.userId ?? '',
          role: existing?.role ?? 'student',
          displayName: existing?.displayName,
          firstName: existing?.firstName,
          lastName: existing?.lastName,
          attendanceStatus,
          absenceJustification:
            absenceJustification !== undefined
              ? (absenceJustification ?? undefined)
              : existing?.absenceJustification,
          absenceComment:
            absenceComment !== undefined
              ? (absenceComment ?? undefined)
              : existing?.absenceComment,
        });
      }

      return updateSessionParticipant(sessionId!, participantId, {
        attendanceStatus,
        ...(absenceJustification !== undefined && { absenceJustification }),
        ...(absenceComment !== undefined && { absenceComment }),
      });
    },
    onSuccess: (data: SessionParticipant, variables, context) => {
      if (context?.requestSeq !== latestRequestSeqRef.current) return;
      if (sessionId) {
        queryClient.setQueryData<SessionParticipant[]>(
          ['session', sessionId, 'participants'],
          (prev) => {
            if (!prev) return prev;
            return prev.map((p) => {
              if (p.id !== variables.participantId) return p;
              const absenceJustification =
                variables.absenceJustification !== undefined
                  ? (variables.absenceJustification ?? undefined)
                  : (data.absenceJustification ?? p.absenceJustification);
              const absenceComment =
                variables.absenceComment !== undefined
                  ? (variables.absenceComment ?? undefined)
                  : (data.absenceComment ?? p.absenceComment);
              return {
                ...p,
                ...data,
                attendanceStatus: variables.attendanceStatus,
                absenceJustification,
                absenceComment,
              };
            });
          },
        );
        queryClient.invalidateQueries({ queryKey: ['gamification'] });
      }
      if (
        variables.attendanceStatus === 'absent' &&
        (variables.absenceJustification ?? '').trim()
      ) {
        options?.onSaved?.(variables.participantId, {
          absenceJustification: (variables.absenceJustification ?? '').trim(),
          absenceComment: (variables.absenceComment ?? '').trim(),
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.attendanceStatus === 'absent' && variables?.participantId) {
        options?.onSettled?.(variables.participantId);
      }
    },
    onError: (error, variables, context) => {
      if (context?.requestSeq !== latestRequestSeqRef.current) return;
      const status = getResponseStatus(error);
      // Fallback: if the device was online when the call was made but the request
      // failed mid-flight due to connectivity loss, enqueue for later retry.
      if (isNetworkError(error) && sessionId) {
        enqueue({
          type: 'attendance_update',
          payload: {
            sessionId,
            participantId: variables.participantId,
            attendanceStatus: variables.attendanceStatus,
            ...(variables.absenceJustification !== undefined && { absenceJustification: variables.absenceJustification }),
            ...(variables.absenceComment !== undefined && { absenceComment: variables.absenceComment }),
          },
        });
        return;
      }

      if (sessionId && context?.previous) {
        queryClient.setQueryData(['session', sessionId, 'participants'], context.previous);
      }
      if (status === 403 || status === 409) {
        if (sessionId) {
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
          queryClient.invalidateQueries({
            queryKey: ['session', sessionId, 'participants'],
          });
        }
        options?.onSessionEndedError?.();
      }
    },
  });
}
