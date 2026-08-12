import { XLSX_MIME } from '@/constants/mime-types';
import { apiClient } from './api-client';
import type {
  Session,
  SessionType,
  CreateSessionDto,
  UpdateSessionDto,
  SessionWithParticipants,
  SessionParticipant,
  SessionStatus,
} from '@/types/session.types';
import { toLocalDateString } from '@/lib/date-utils';

export interface SessionListItem {
  id: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  type: SessionType;
  status: SessionStatus;
  recurrenceType?:
    | 'once'
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'several_days_per_week'
    | 'custom'
    | 'none';
  establishmentName?: string | null;
  establishment?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    label: string;
  };
  level?: {
    id: string;
    label: string;
  };
  room?: {
    id: string;
    name: string;
  };
  activity?: {
    id: string;
    name: string;
    maxStudentsPerTutor?: number;
  };
  participants?: Array<{
    id: string;
    userId: string;
    role: 'tutor' | 'student' | 'volunteer';
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      displayName?: string;
      email?: string;
      userProfiles?: Array<{
        id: string;
        subjects?: unknown;
        level?: { id: string; label: string };
      }>;
    };
  }>;
  studentTutorPairs?: Array<{
    id: string;
    sessionId: string;
    studentUserId: string;
    tutorUserId: string;
    assignmentSource: string;
  }>;
}

export interface SessionsResponse {
  data: SessionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const buildSessionQueryParams = (params?: {
  page?: number;
  pageSize?: number;
  types?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  establishmentId?: string;
  subjectId?: string;
  levelId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  recurrenceType?: string;
}): URLSearchParams => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.types && params.types.length > 0) {
    params.types.forEach((type) => queryParams.append('types', type));
  }
  if (params?.statuses && params.statuses.length > 0) {
    params.statuses.forEach((status) => queryParams.append('statuses', status.toUpperCase()));
  }
  if (params?.dateFrom) {
    queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  }
  if (params?.dateTo) {
    queryParams.append('dateTo', toLocalDateString(params.dateTo));
  }
  if (params?.establishmentId) {
    queryParams.append('establishmentId', params.establishmentId);
  }
  if (params?.subjectId) {
    queryParams.append('subjectId', params.subjectId);
  }
  if (params?.levelId) {
    queryParams.append('levelId', params.levelId);
  }
  if (params?.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params?.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.recurrenceType) {
    queryParams.append('recurrenceType', params.recurrenceType);
  }
  return queryParams;
};

export const getSessions = async (params?: {
  page?: number;
  pageSize?: number;
  types?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  establishmentId?: string;
  subjectId?: string;
  levelId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  recurrenceType?: string;
}): Promise<SessionsResponse> => {
  const queryParams = buildSessionQueryParams(params);
  const queryString = queryParams.toString();
  const url = queryString ? `/sessions?${queryString}` : '/sessions';

  const response = await apiClient.get<{
    data: Array<
      Omit<SessionListItem, 'sessionDate' | 'status'> & { sessionDate: string; status: string }
    >;
    total: number;
    page: number;
    pageSize: number;
  }>(url);

  return {
    data: response.data.data.map((session) => {
      const [year, month, day] = session.sessionDate.split('-').map(Number);
      const sessionDate = new Date(year, month - 1, day);

      return {
        ...session,
        sessionDate,
        status: session.status as SessionListItem['status'],
      };
    }),
    total: response.data.total,
    page: response.data.page,
    pageSize: response.data.pageSize,
  };
};

export const getSession = async (id: string): Promise<SessionWithParticipants> => {
  const [sessionRes, participantsRes] = await Promise.all([
    apiClient.get<Omit<Session, 'sessionDate'> & { sessionDate: string }>(`/sessions/${id}`),
    apiClient.get<SessionParticipant[]>(`/sessions/${id}/participants`),
  ]);

  const [year, month, day] = sessionRes.data.sessionDate.split('-').map(Number);
  const sessionDate = new Date(year, month - 1, day);

  return {
    ...sessionRes.data,
    sessionDate,
    participants: participantsRes.data,
  };
};

export const createSession = async (dto: CreateSessionDto): Promise<Session | Session[]> => {
  const { data } = await apiClient.post('/sessions', dto);
  return data;
};

export const updateSession = async (id: string, dto: UpdateSessionDto): Promise<Session> => {
  const { data } = await apiClient.patch(`/sessions/${id}`, dto);
  return data;
};

export const deleteSession = async (id: string): Promise<void> => {
  await apiClient.delete(`/sessions/${id}`);
};

export const cancelSession = async (id: string): Promise<Session> => {
  const { data } = await apiClient.patch(`/sessions/${id}`, { status: 'CANCELLED' });
  return data;
};

export interface UpdateParticipantAttendanceDto {
  attendanceStatus: 'present' | 'absent' | 'excused' | 'pending';
  absenceJustification?: string | null;
  absenceComment?: string | null;
}

export const updateParticipantAttendance = async (
  sessionId: string,
  participantId: string,
  dto: UpdateParticipantAttendanceDto,
): Promise<SessionParticipant> => {
  const { data } = await apiClient.patch(
    `/sessions/${sessionId}/participants/${participantId}`,
    dto,
  );
  return data;
};

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
}

export interface TutorAvailabilityResult {
  available: boolean;
  conflictingSession?: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
  };
}

/** Check whether a tutor already has a session at the given date/time slot (read-only). */
export const checkTutorAvailability = async (params: {
  tutorId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  excludeSessionId?: string;
}): Promise<TutorAvailabilityResult> => {
  const query = new URLSearchParams({
    tutorId: params.tutorId,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
  });
  if (params.excludeSessionId) {
    query.append('excludeSessionId', params.excludeSessionId);
  }
  const { data } = await apiClient.get<TutorAvailabilityResult>(
    `/sessions/check-tutor-availability?${query.toString()}`,
  );
  return data;
};

export interface RoomCapacityResult {
  available: boolean;
  roomName: string;
  capacity: number | null;
  currentParticipants: number;
  participantsToAdd: number;
  totalIfAdded: number;
  remaining: number | null;
  message?: string;
}

/** Check whether a room can accommodate the additional participants on the given slot. */
export const checkRoomCapacity = async (params: {
  roomId: string;
  participantsToAdd: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  excludeSessionId?: string;
}): Promise<RoomCapacityResult> => {
  const query = new URLSearchParams({
    roomId: params.roomId,
    participantsToAdd: String(params.participantsToAdd),
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
  });
  if (params.excludeSessionId) {
    query.append('excludeSessionId', params.excludeSessionId);
  }
  const { data } = await apiClient.get<RoomCapacityResult>(
    `/sessions/check-room-capacity?${query.toString()}`,
  );
  return data;
};

export interface BulkCreateResult {
  summary: { total: number; created: number; failed: number };
  results: Array<{
    index: number;
    status: 'created' | 'error';
    data?: Session | Session[];
    error?: string;
  }>;
}

/** Create one or several sessions in a single request. Each item supports recurrence. */
export const createSessionsBulk = async (
  sessions: CreateSessionDto[],
): Promise<BulkCreateResult> => {
  const { data } = await apiClient.post<BulkCreateResult>('/sessions/bulk', { sessions });
  return data;
};

/** Export sessions as Excel (.xlsx). */
export const exportSessionsExcel = async (params?: {
  types?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  establishmentId?: string;
  subjectId?: string;
  levelId?: string;
}): Promise<void> => {
  const queryParams = new URLSearchParams();
  params?.types?.forEach((t) => queryParams.append('types', t));
  params?.statuses?.forEach((s) => queryParams.append('statuses', s.toUpperCase()));
  if (params?.dateFrom) queryParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) queryParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.establishmentId) queryParams.append('establishmentId', params.establishmentId);
  if (params?.subjectId) queryParams.append('subjectId', params.subjectId);
  if (params?.levelId) queryParams.append('levelId', params.levelId);

  const response = await apiClient.get(`/sessions/export?${queryParams.toString()}`, {
    responseType: 'blob',
  });
  triggerBlobDownload(
    new Blob([response.data], { type: XLSX_MIME }),
    `sessions-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};
