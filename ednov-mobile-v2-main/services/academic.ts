import { env } from '@/config/env';
import api from '@/services/api';

export type AcademicOption = { id: string; label: string };

export type RoleOption = { id: string; code: string; label: string };

export type SpecialtyOption = {
  id: string;
  label: string;
  levelIds: string[];
};

function mapPaginatedOptions(payload: unknown): AcademicOption[] {
  const items =
    payload != null && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload;
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        label: String(r.label ?? r.name ?? r.code ?? ''),
      };
    })
    .filter((o) => o.id.length > 0 && o.label.length > 0);
}

export async function fetchLevels(): Promise<AcademicOption[]> {
  if (env.useStaticData || !env.apiUrl) return [];
  // Backend ListLevelsQueryDto: pageSize max = 100 (web uses 100).
  const { data } = await api.get<unknown>('/academic/levels', {
    params: { page: 1, pageSize: 100 },
  });
  return mapPaginatedOptions(data);
}

export async function fetchSchoolClasses(options?: {
  levelId?: string;
  establishmentId?: string;
}): Promise<AcademicOption[]> {
  if (env.useStaticData || !env.apiUrl) return [];
  // PaginationQueryDto: pageSize max = 100.
  const params: Record<string, string | number> = { page: 1, pageSize: 100 };
  if (options?.levelId) params.levelId = options.levelId;
  if (options?.establishmentId) params.establishmentId = options.establishmentId;
  const { data } = await api.get<unknown>('/academic/school-classes', { params });
  return mapPaginatedOptions(data);
}

/** GET /specialties?activeOnly=true — aligned with web getSpecialties. */
export async function fetchSpecialties(activeOnly = true): Promise<SpecialtyOption[]> {
  if (env.useStaticData || !env.apiUrl) return [];
  const { data } = await api.get<unknown>('/specialties', {
    params: { activeOnly },
  });
  const arr = Array.isArray(data)
    ? data
    : data != null && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
      ? ((data as { data: unknown[] }).data ?? [])
      : [];
  return arr
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      const links = Array.isArray(r.levelLinks) ? r.levelLinks : [];
      const levelIds = links
        .map((ll) => {
          const link = (ll ?? {}) as Record<string, unknown>;
          const level = (link.level ?? {}) as Record<string, unknown>;
          return String(level.id ?? '');
        })
        .filter((id) => id.length > 0);
      return {
        id: String(r.id ?? ''),
        label: String(r.label ?? r.code ?? ''),
        levelIds,
      };
    })
    .filter((s) => s.id.length > 0 && s.label.length > 0);
}

export async function fetchRoles(): Promise<RoleOption[]> {
  if (env.useStaticData || !env.apiUrl) {
    return [{ id: 'static-student-role', code: 'student', label: 'Élève' }];
  }
  const { data } = await api.get<unknown>('/roles');
  const payload =
    data != null && typeof data === 'object'
      ? (data as { data?: unknown; items?: unknown })
      : undefined;
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : [];
  return arr
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        code: String(r.code ?? '').toLowerCase(),
        label: String(r.label ?? r.code ?? ''),
      };
    })
    .filter((r) => r.id.length > 0);
}
