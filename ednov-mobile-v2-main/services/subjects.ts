import { env } from '@/config/env';
import api from '@/services/api';
import { getStaticSubjectCatalog } from '@/data/staticData';

export interface SubjectOption {
  id: string;
  label: string;
}

/** Aligné sur Ednov-web `getSubjects` / `PaginatedResponse<Subject>` (Nest). */
interface PaginatedSubjectsResponse {
  data: unknown[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Liste paginée des matières entreprise — même endpoint que le web :
 * `GET /api/v1/academic/subjects` (le préfixe `/api/v1` vient du `baseURL` axios).
 *
 * @see Ednov-web `getSubjects` dans `services/academic.service.ts`
 */
export async function fetchSubjectsCatalog(): Promise<SubjectOption[]> {
  if (env.useStaticData) {
    return getStaticSubjectCatalog();
  }

  const searchParams = new URLSearchParams();
  searchParams.append('page', '1');
  searchParams.append('pageSize', '500');

  const url = `/academic/subjects${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const { data } = await api.get<PaginatedSubjectsResponse>(url);

  const items = Array.isArray(data?.data) ? data.data : [];
  return items
    .map((item: unknown) => {
      const r = item as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        label: String(r.label ?? ''),
      };
    })
    .filter((s) => s.id.length > 0 && s.label.length > 0);
}
