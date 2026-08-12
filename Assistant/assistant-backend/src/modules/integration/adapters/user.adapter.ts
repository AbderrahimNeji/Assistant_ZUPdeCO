import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';
import { RequestContextStore } from '../request-context';

type Paginated<T> = {
  data?: T[];
  items?: T[];
  results?: T[];
  total?: number;
};

export type EdnovUserRow = {
  id: string;
  companyId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  displayName?: string | null;
  status?: string;
  pendingActivation?: boolean;
  presentSessionCount?: number;
  reactivationTargetStatus?: string;
  deactivationReason?: string | null;
  deactivationReasonNote?: string | null;
  userRoles?: Array<{ role?: { code?: string; label?: string } }>;
  userProfiles?: Array<{
    subjects?: unknown;
    subjectNames?: string[] | null;
    level?: { id?: string; label?: string } | null;
    guardianContact?: Record<string, unknown> | null;
    isMinor?: boolean | null;
    hasSpecialNeeds?: boolean | null;
  }>;
  userEstablishments?: Array<{
    establishmentId?: string;
    establishment?: {
      id?: string;
      name?: string | null;
      city?: string | null;
    } | null;
  }>;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type ListStudentsQuery = {
  limit?: number;
  page?: number;
  search?: string;
  statuses?: string[];
  establishmentId?: string;
  establishmentIds?: string[];
  levelIds?: string[];
  classIds?: string[];
  specialtyIds?: string[];
  subjectIds?: string[];
  isMinor?: boolean;
  hasSpecialNeeds?: boolean;
  /** Filter on user createdAt (GET /users/students dateFrom/dateTo). */
  dateFrom?: string;
  dateTo?: string;
};

export type ListTutorsQuery = {
  limit?: number;
  page?: number;
  search?: string;
  statuses?: string[];
  establishmentId?: string;
  establishmentIds?: string[];
  subjectIds?: string[];
  /** 0=Sunday .. 6=Saturday — weekly availability slot day */
  availabilityDays?: number[];
  availabilityDayOfWeek?: number;
  availabilityStartTime?: string;
  availabilityEndTime?: string;
};

export type TutorListItem = {
  id: string;
  firstName: string;
  lastName: string;
  status?: string | null;
  coursesTaught: Array<{ id: string; title: string; subject: string }>;
  establishments: Array<{ id?: string; name?: string; city?: string }>;
};

export type StudentStatusHistoryEntry = {
  previousStatus?: string | null;
  newStatus?: string | null;
  source?: string | null;
  reason?: string | null;
  reasonNote?: string | null;
  createdAt?: string | Date | null;
};

@Injectable()
export class UserAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async getMe() {
    return this.ednov.get<EdnovUserRow>('/users/login');
  }

  async getCompanyId(): Promise<string | null> {
    const fromCtx = RequestContextStore.getEdnovCompanyId();
    if (fromCtx) return fromCtx;
    const me = await this.getMe();
    const id = me.companyId?.trim();
    if (id) {
      RequestContextStore.patch({ ednovCompanyId: id });
      return id;
    }
    return null;
  }

  async updateMe(data: { firstName?: string; lastName?: string }) {
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!firstName && !lastName) {
      throw new BadRequestException('No profile fields to update');
    }
    return this.ednov.patch<EdnovUserRow>('/users/me', {
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    });
  }

  async listTutors(
    limitOrQuery: number | ListTutorsQuery = 10,
  ): Promise<TutorListItem[]> {
    const result = await this.listTutorsPage(
      typeof limitOrQuery === 'number'
        ? { limit: limitOrQuery }
        : limitOrQuery,
    );
    return result.tutors;
  }

  async listTutorsPage(query: ListTutorsQuery = {}): Promise<{
    tutors: TutorListItem[];
    total: number | null;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 20));
    const raw = await this.ednov.get<
      (Paginated<EdnovUserRow> & { total?: number }) | EdnovUserRow[]
    >('/users/tutors', {
      params: {
        page,
        pageSize,
        ...(query.search?.trim() ? { search: query.search.trim() } : {}),
        ...(query.statuses?.length ? { statuses: query.statuses } : {}),
        ...(query.establishmentId
          ? { establishmentId: query.establishmentId }
          : {}),
        ...(query.establishmentIds?.length
          ? { establishmentIds: query.establishmentIds }
          : {}),
        ...(query.subjectIds?.length ? { subjectIds: query.subjectIds } : {}),
        ...(query.availabilityDays?.length
          ? { availabilityDays: query.availabilityDays }
          : {}),
        ...(query.availabilityDayOfWeek !== undefined
          ? { availabilityDayOfWeek: query.availabilityDayOfWeek }
          : {}),
        ...(query.availabilityStartTime
          ? { availabilityStartTime: query.availabilityStartTime }
          : {}),
        ...(query.availabilityEndTime
          ? { availabilityEndTime: query.availabilityEndTime }
          : {}),
      },
    });
    const tutors = this.unwrapList(raw)
      .slice(0, pageSize)
      .map((row) => this.mapTutor(row));
    const total =
      !Array.isArray(raw) && typeof raw.total === 'number' ? raw.total : null;
    return { tutors, total, page, pageSize };
  }

  async findTutorsByName(name: string) {
    const query = name.trim();
    if (!query) return [];
    const page = await this.listTutorsPage({ limit: 8, search: query });
    return page.tutors;
  }

  async listStudents(
    limitOrQuery: number | ListStudentsQuery = 20,
  ): Promise<EdnovUserRow[]> {
    const result = await this.listStudentsPage(
      typeof limitOrQuery === 'number'
        ? { limit: limitOrQuery }
        : limitOrQuery,
    );
    return result.students;
  }

  async listStudentsPage(query: ListStudentsQuery = {}): Promise<{
    students: EdnovUserRow[];
    total: number | null;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 20));
    const raw = await this.ednov.get<
      (Paginated<EdnovUserRow> & { total?: number }) | EdnovUserRow[]
    >('/users/students', {
      params: {
        page,
        pageSize,
        ...(query.search?.trim() ? { search: query.search.trim() } : {}),
        ...(query.statuses?.length ? { statuses: query.statuses } : {}),
        ...(query.establishmentId
          ? { establishmentId: query.establishmentId }
          : {}),
        ...(query.establishmentIds?.length
          ? { establishmentIds: query.establishmentIds }
          : {}),
        ...(query.levelIds?.length ? { levelIds: query.levelIds } : {}),
        ...(query.classIds?.length ? { classIds: query.classIds } : {}),
        ...(query.specialtyIds?.length
          ? { specialtyIds: query.specialtyIds }
          : {}),
        ...(query.subjectIds?.length ? { subjectIds: query.subjectIds } : {}),
        ...(typeof query.isMinor === 'boolean'
          ? { isMinor: query.isMinor }
          : {}),
        ...(typeof query.hasSpecialNeeds === 'boolean'
          ? { hasSpecialNeeds: query.hasSpecialNeeds }
          : {}),
        ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
        ...(query.dateTo ? { dateTo: query.dateTo } : {}),
      },
    });
    const students = this.unwrapList(raw).slice(0, pageSize);
    const total =
      !Array.isArray(raw) && typeof raw.total === 'number' ? raw.total : null;
    return { students, total, page, pageSize };
  }

  async countStudents(statuses?: string[]): Promise<number> {
    const page = await this.listStudentsPage({
      limit: 1,
      page: 1,
      ...(statuses?.length ? { statuses } : {}),
    });
    if (page.total != null) return page.total;
    const list = await this.listStudents(
      statuses?.length ? { limit: 100, statuses } : 100,
    );
    return list.length;
  }

  async countTutors(statuses?: string[]): Promise<number> {
    const page = await this.listTutorsPage({
      limit: 1,
      page: 1,
      ...(statuses?.length ? { statuses } : {}),
    });
    if (page.total != null) return page.total;
    const list = await this.listTutors(
      statuses?.length ? { limit: 100, statuses } : 100,
    );
    return list.length;
  }

  /**
   * Account status transitions from GET /users/:id/status-history (staff + students).
   */
  async getUserStatusHistory(
    userId: string,
  ): Promise<StudentStatusHistoryEntry[]> {
    const raw = await this.ednov.get<
      StudentStatusHistoryEntry[] | Paginated<StudentStatusHistoryEntry>
    >(`/users/${encodeEdnovId(userId)}/status-history`);
    if (Array.isArray(raw)) return raw;
    return raw.data ?? raw.items ?? raw.results ?? [];
  }

  async searchStudents(query: string, limit = 10) {
    const q = query.trim();
    if (!q) return [];
    const page = await this.listStudentsPage({ limit, search: q });
    return page.students;
  }

  async findStudentById(id: string) {
    try {
      return await this.ednov.get<EdnovUserRow>(
        `/users/students/${encodeEdnovId(id)}`,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new NotFoundException('Student not found');
    }
  }

  async findTutorById(id: string) {
    try {
      return await this.ednov.get<EdnovUserRow>(
        `/users/tutors/${encodeEdnovId(id)}`,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new NotFoundException('Tutor not found');
    }
  }

  /** GET /users/:id — generic user record. Never used as a 403 fallback. */
  async getUserById(id: string) {
    return this.ednov.get<EdnovUserRow>(`/users/${encodeEdnovId(id)}`);
  }

  /**
   * Student account status transitions from GET /users/:id/status-history.
   */
  async getStudentStatusHistory(
    studentId: string,
  ): Promise<StudentStatusHistoryEntry[]> {
    const raw = await this.ednov.get<
      StudentStatusHistoryEntry[] | Paginated<StudentStatusHistoryEntry>
    >(`/users/${encodeEdnovId(studentId)}/status-history`);
    if (Array.isArray(raw)) return raw;
    return raw.data ?? raw.items ?? raw.results ?? [];
  }

  /**
   * Parent/guardian contacts are embedded on student profiles (guardianContact).
   * Returns sanitized name-only facts — never phones/emails in skill facts.
   */
  async listGuardianContacts(limit = 15): Promise<
    Array<{
      studentLabel: string;
      guardianName?: string;
      relationship?: string;
    }>
  > {
    const students = await this.listStudents(limit);
    const rows: Array<{
      studentLabel: string;
      guardianName?: string;
      relationship?: string;
    }> = [];
    for (const student of students.slice(0, limit)) {
      try {
        const detail = await this.ednov.get<EdnovUserRow>(
          `/users/students/${encodeEdnovId(student.id)}`,
        );
        const contact =
          detail.userProfiles?.[0]?.guardianContact ?? null;
        if (!contact || typeof contact !== 'object') continue;
        const guardianName =
          (typeof contact.name === 'string' && contact.name.trim()) ||
          (typeof contact.fullName === 'string' && contact.fullName.trim()) ||
          [
            typeof contact.firstName === 'string' ? contact.firstName : '',
            typeof contact.lastName === 'string' ? contact.lastName : '',
          ]
            .join(' ')
            .trim() ||
          undefined;
        const relationship =
          typeof contact.relationship === 'string'
            ? contact.relationship
            : typeof contact.relation === 'string'
              ? contact.relation
              : undefined;
        rows.push({
          studentLabel:
            `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim() ||
            detail.displayName?.trim() ||
            'Student',
          guardianName,
          relationship,
        });
      } catch {
        // Skip students the token cannot expand — never elevate.
      }
    }
    return rows;
  }

  /** Map Ednov /users/login into Assistant profile shape. */
  toProfileShape(
    user: EdnovUserRow,
    role: UserRole,
  ): {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  } {
    return {
      id: user.id,
      firstName: user.firstName?.trim() || 'User',
      lastName: user.lastName?.trim() || '',
      email: user.email?.trim() || '',
      role,
    };
  }

  resolveFocusedStudentId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.student?.id) return ctx.student.id;
    if (ctx?.selection?.primary?.type === 'student') {
      return ctx.selection.primary.id;
    }
    return ctx?.selection?.entities?.find((e) => e.type === 'student')?.id;
  }

  resolveFocusedTutorId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.tutor?.id) return ctx.tutor.id;
    if (isTutorRefType(ctx?.selection?.primary?.type)) {
      return ctx?.selection?.primary?.id;
    }
    return ctx?.selection?.entities?.find((e) => isTutorRefType(e.type))?.id;
  }

  resolveFocusedUserId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.user?.id) return ctx.user.id;
    if (ctx?.selection?.primary?.type === 'user') {
      return ctx.selection.primary.id;
    }
    return undefined;
  }

  resolveFocusedParentId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.parent?.id) return ctx.parent.id;
    if (ctx?.selection?.primary?.type === 'parent') {
      return ctx.selection.primary.id;
    }
    return undefined;
  }

  resolveEstablishmentFilterId(): string | undefined {
    const ctx = RequestContextStore.getApplicationContext();
    if (ctx?.establishment?.id) return ctx.establishment.id;
    const filters = ctx?.filters;
    if (filters && typeof filters === 'object') {
      const id = filters.establishmentId ?? filters.establishment_id;
      if (typeof id === 'string' && id.trim()) return id.trim();
    }
    return undefined;
  }

  private mapTutor(row: EdnovUserRow): TutorListItem {
    const subjects =
      row.userProfiles?.[0]?.subjectNames?.filter(Boolean) ?? [];
    const establishments = (row.userEstablishments ?? [])
      .map((ue) => ({
        id: ue.establishmentId ?? ue.establishment?.id,
        name: ue.establishment?.name?.trim() || undefined,
        city: ue.establishment?.city?.trim() || undefined,
      }))
      .filter((e) => e.id || e.name || e.city);
    return {
      id: row.id,
      firstName:
        row.firstName?.trim() || row.displayName?.split(/\s+/)[0] || 'Tutor',
      lastName:
        row.lastName?.trim() ||
        row.displayName?.split(/\s+/).slice(1).join(' ') ||
        '',
      status: row.status ?? null,
      coursesTaught: subjects.slice(0, 5).map((subject, index) => ({
        id: `${row.id}-subject-${index}`,
        title: subject,
        subject,
      })),
      establishments,
    };
  }

  /**
   * GET /search/global — tutors, students, volunteers, admins, establishments.
   * Ednov caps pageSize at 5.
   */
  async globalSearch(q: string, pageSize = 5): Promise<{
    query: string;
    students: EdnovUserRow[];
    tutors: EdnovUserRow[];
    establishments: Array<{ id?: string; name?: string; city?: string }>;
    others: number;
  }> {
    const query = q.trim();
    if (query.length < 2) {
      return { query, students: [], tutors: [], establishments: [], others: 0 };
    }
    const raw = await this.ednov.get<{
      data?: Record<string, Paginated<EdnovUserRow> | EdnovUserRow[]>;
      totalResults?: number;
    }>('/search/global', {
      params: { q: query, page: 1, pageSize: Math.min(5, pageSize) },
    });
    const bag = raw.data ?? (raw as unknown as Record<string, unknown>);
    const pick = (key: string): EdnovUserRow[] => {
      const block = (bag as Record<string, unknown>)[key] as
        | Paginated<EdnovUserRow>
        | EdnovUserRow[]
        | undefined;
      if (!block) return [];
      return this.unwrapList(block);
    };
    const estBlock = (bag as Record<string, unknown>).establishments as
      | Paginated<{ id?: string; name?: string; city?: string }>
      | Array<{ id?: string; name?: string; city?: string }>
      | undefined;
    const establishments = Array.isArray(estBlock)
      ? estBlock
      : estBlock?.data ?? estBlock?.items ?? estBlock?.results ?? [];
    return {
      query,
      students: pick('students'),
      tutors: pick('tutors'),
      establishments,
      others: pick('volunteers').length + pick('admins').length,
    };
  }

  private unwrapList(
    page: Paginated<EdnovUserRow> | EdnovUserRow[],
  ): EdnovUserRow[] {
    if (Array.isArray(page)) return page;
    return page.data ?? page.items ?? page.results ?? [];
  }
}

function isTutorRefType(type?: string): boolean {
  return /^(tutor|tuteur|tuteure|teacher)$/i.test((type ?? '').trim());
}
