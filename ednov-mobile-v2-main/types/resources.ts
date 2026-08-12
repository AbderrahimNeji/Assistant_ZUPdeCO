/**
 * Pedagogical resources aligned with backend GET /resources and GET /resources/:id.
 */

export interface PedagogicalResource {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  content?: string | null;
  subjectId?: string | null;
  levelId?: string | null;
  subject?: { id: string; label: string } | null;
  level?: { id: string; label: string } | null;
  type?: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourcesListQuery {
  page?: number;
  pageSize?: number;
  subjectId?: string;
  levelId?: string;
}

export interface ResourcesListResponse {
  data: PedagogicalResource[];
  total: number;
  page: number;
  pageSize: number;
}
