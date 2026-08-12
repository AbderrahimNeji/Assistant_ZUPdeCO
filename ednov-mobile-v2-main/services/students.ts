import { env } from '@/config/env';
import api from '@/services/api';
import type { Student } from '@/types/student';
import { getStaticStudents } from '@/data/staticData';
import { useCompanyStore } from '@/store/companyStore';

/** Matches backend PaginationQueryDto MAX_PAGE_SIZE — fetch in pages to build full tutor list. */
const STUDENTS_PAGE_SIZE = 100;

/** Staff-only mobile users: single page avoids loading entire company directory into memory. */
function shouldRequestTutorStudentList(): boolean {
  const codes = useCompanyStore.getState().roleCodes;
  return codes.some((c) => {
    const u = (c ?? '').toUpperCase();
    return u === 'TUTOR' || u === 'VOLUNTEER';
  });
}

/** Backend returns either a bare array or `{ data, total, page, pageSize }` (see users.controller getStudents). */
function normalizeStudentsListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload != null && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

function totalFromStudentsPayload(payload: unknown, pageLength: number): number {
  if (payload != null && typeof payload === 'object' && 'total' in payload) {
    const t = (payload as { total: unknown }).total;
    if (typeof t === 'number' && Number.isFinite(t) && t >= 0) return Math.trunc(t);
  }
  return pageLength;
}

export type StudentsFetchResult = { students: Student[]; total: number };

function extractLevelLabelFromUser(raw: Record<string, unknown>): string | null {
  const profiles = raw.userProfiles ?? raw.user_profiles;
  if (!Array.isArray(profiles)) return null;
  for (const p of profiles) {
    if (p == null || typeof p !== 'object') continue;
    const prof = p as Record<string, unknown>;
    const level = prof.level;
    if (level != null && typeof level === 'object') {
      const lv = level as Record<string, unknown>;
      const label = lv.label;
      if (typeof label === 'string' && label.trim() !== '') return label.trim();
      const code = lv.code;
      if (typeof code === 'string' && code.trim() !== '') return code.trim();
    }
    const gl = prof.gradeLevel ?? prof.grade_level;
    if (typeof gl === 'string' && gl.trim() !== '') return gl.trim();
  }
  return null;
}

function mapRawToStudent(raw: Record<string, unknown>): Student {
  const id = raw.id;
  let idStr = '';
  if (id != null) {
    if (typeof id === 'string') idStr = id;
    else if (typeof id === 'number') idStr = String(id);
  }
  const first = raw.firstName ?? raw.first_name ?? '';
  const last = raw.lastName ?? raw.last_name ?? '';
  const displayRaw =
    raw.displayName ??
    raw.display_name ??
    raw.publicName ??
    raw.public_name ??
    raw.pseudo ??
    raw.label ??
    null;
  const program = raw.program ?? raw.programme ?? null;
  const displayName = typeof displayRaw === 'string' && displayRaw.trim() !== '' ? displayRaw.trim() : null;
  const fromProfiles = extractLevelLabelFromUser(raw);
  const topLevel =
    fromProfiles ??
    (typeof raw.levelLabel === 'string' && raw.levelLabel.trim() !== ''
      ? raw.levelLabel.trim()
      : typeof raw.level_label === 'string' && raw.level_label.trim() !== ''
        ? raw.level_label.trim()
        : null);
  return {
    id: idStr,
    displayName,
    firstName: typeof first === 'string' ? first : '',
    lastName: typeof last === 'string' ? last : '',
    levelLabel: topLevel,
    program: typeof program === 'string' ? program : null,
  };
}

export async function fetchStudentsWithMeta(): Promise<StudentsFetchResult> {
  if (env.useStaticData) {
    const students = getStaticStudents();
    return { students, total: students.length };
  }
  if (env.apiUrl) {
    const tutorScope = shouldRequestTutorStudentList();
    const merged: Student[] = [];
    let reportedTotal = 0;
    let page = 1;
    const maxPages = 500;
    while (page <= maxPages) {
      const { data } = await api.get<unknown>('/users/students', {
        params: {
          page,
          pageSize: STUDENTS_PAGE_SIZE,
          ...(tutorScope ? { tutorStudentList: true } : {}),
        },
      });
      const arr = normalizeStudentsListPayload(data);
      reportedTotal = totalFromStudentsPayload(data, merged.length + arr.length);
      for (const item of arr) {
        merged.push(mapRawToStudent((item ?? {}) as Record<string, unknown>));
      }
      if (!tutorScope) break;
      if (merged.length >= reportedTotal || arr.length < STUDENTS_PAGE_SIZE || arr.length === 0) break;
      page += 1;
    }
    return { students: merged, total: reportedTotal };
  }
  const students = getStaticStudents();
  return { students, total: students.length };
}

export async function fetchStudents(): Promise<Student[]> {
  const { students } = await fetchStudentsWithMeta();
  return students;
}

export type FetchEstablishmentStudentsQuery = {
  establishmentId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  excludeIds?: string[];
};

/** Students of an establishment for the presential add-student picker (sameEstablishment=true). */
export async function fetchStudentsByEstablishment(
  query: FetchEstablishmentStudentsQuery,
): Promise<StudentsFetchResult> {
  if (env.useStaticData || !env.apiUrl) {
    const all = getStaticStudents();
    const search = (query.search ?? '').trim().toLowerCase();
    const exclude = new Set(query.excludeIds ?? []);
    let filtered = all.filter((s) => !exclude.has(s.id));
    if (search) {
      filtered = filtered.filter((s) => {
        const hay = `${s.displayName ?? ''} ${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase();
        return hay.includes(search);
      });
    }
    return { students: filtered, total: filtered.length };
  }

  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
    establishmentId: query.establishmentId,
    sameEstablishment: 'true',
    tutorStudentList: 'true',
  };
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.excludeIds?.length) params.excludeIds = query.excludeIds.join(',');

  const { data } = await api.get<unknown>('/users/students', { params });
  const arr = normalizeStudentsListPayload(data);
  const students = arr.map((item) => mapRawToStudent((item ?? {}) as Record<string, unknown>));
  return { students, total: totalFromStudentsPayload(data, students.length) };
}

export type CreateStudentPayload = {
  firstName: string;
  lastName: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F' | 'O';
  levelId?: string;
  schoolClassId?: string;
  roleIds: string[];
  establishmentIds: string[];
  subjects?: string[];
  availability?: {
    weekly: Array<{ day: number; start: string; end: string }>;
  };
  hasSpecialNeeds?: boolean;
  specialNeedsType?: string;
  specialNeedsNote?: string;
  isDisabled?: boolean;
  disabilityTypes?: string[];
  disabilityOtherNote?: string;
  medicalNotes?: string;
  specialtyIds?: string[];
};

/** POST /users — create student (établissement must be tutor-accessible). */
export async function createStudent(payload: CreateStudentPayload): Promise<Student> {
  if (env.useStaticData || !env.apiUrl) {
    return {
      id: `static-student-${Date.now()}`,
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName: payload.displayName ?? `${payload.firstName} ${payload.lastName}`.trim(),
      levelLabel: null,
      program: null,
    };
  }
  const { data } = await api.post<unknown>('/users', payload);
  const raw =
    data != null && typeof data === 'object' && 'data' in (data as object)
      ? ((data as { data: unknown }).data as Record<string, unknown>)
      : (data as Record<string, unknown>);
  return mapRawToStudent(raw ?? {});
}

