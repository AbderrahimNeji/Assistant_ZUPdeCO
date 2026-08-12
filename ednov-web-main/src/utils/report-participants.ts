import type { SessionParticipant } from '@/types/session.types';

export function partitionParticipantsForReport(participants: SessionParticipant[] | undefined): {
  vscParticipants: SessionParticipant[];
  attendanceParticipants: SessionParticipant[];
} {
  const list = participants ?? [];
  return {
    vscParticipants: list.filter((p) => p.role === 'volunteer'),
    attendanceParticipants: list.filter((p) => p.role !== 'volunteer'),
  };
}
