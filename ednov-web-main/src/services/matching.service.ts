import { apiClient } from './api-client';
import type {
  AssignmentCandidatesResponse,
  AutoAssignmentProposal,
  BinomeCoeur,
  CreateBinomeCoeurDto,
  ListBinomeCoeurQuery,
  ProposeDraftAutoAssignmentDto,
  SessionStudentTutorPair,
  SetAssignmentsDto,
} from '@/types/matching.types';
import { toLocalDateString } from '@/lib/date-utils';

/** Préfixe company : `current` est remplacé par le companyId du JWT (voir api-client). */
const COMPANY_BINOME_COEUR = '/companies/current/binome-coeur';
const SESSIONS_BASE = '/companies/current/sessions';

// --- Session student-tutor pairs (pour interface matching) ---

/**
 * Récupère tous les couples élève-tuteur (session_student_tutor_pairs) avec leurs relations.
 * Utilisé par l'interface matching pour afficher la liste des affectations existantes.
 * GET /companies/current/sessions/student-tutor-pairs
 */
export const getSessionStudentTutorPairs = async (params?: {
  page?: number;
  pageSize?: number;
  types?: string[];
  sessionId?: string;
  tutorId?: string;
  studentId?: string;
  establishmentId?: string;
  subjectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tutorSearch?: string;
  studentSearch?: string;
}): Promise<{ data: SessionStudentTutorPair[]; total: number; page: number; pageSize: number }> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  params?.types?.forEach((t) => searchParams.append('types', t));

  if (params?.sessionId) searchParams.append('sessionId', params.sessionId);
  if (params?.tutorId) searchParams.append('tutorId', params.tutorId);
  if (params?.studentId) searchParams.append('studentId', params.studentId);
  if (params?.establishmentId) searchParams.append('establishmentId', params.establishmentId);
  if (params?.subjectId) searchParams.append('subjectId', params.subjectId);
  if (params?.dateFrom) searchParams.append('dateFrom', toLocalDateString(params.dateFrom));
  if (params?.dateTo) searchParams.append('dateTo', toLocalDateString(params.dateTo));
  if (params?.tutorSearch) searchParams.append('tutorSearch', params.tutorSearch);
  if (params?.studentSearch) searchParams.append('studentSearch', params.studentSearch);

  const path = `${SESSIONS_BASE}/student-tutor-pairs`;
  const qs = searchParams.toString();
  const url = qs ? `${path}?${qs}` : path;
  const { data } = await apiClient.get<{
    data: SessionStudentTutorPair[];
    total: number;
    page: number;
    pageSize: number;
  }>(url);
  return data;
};

/**
 * Récupère un couple élève-tuteur par son ID.
 * GET /companies/current/sessions/student-tutor-pairs/:id
 */
export const getSessionStudentTutorPair = async (id: string): Promise<SessionStudentTutorPair> => {
  const { data } = await apiClient.get<SessionStudentTutorPair>(
    `${SESSIONS_BASE}/student-tutor-pairs/${id}`,
  );
  return data;
};

// --- Séance : candidats, affectation manuelle, auto ---

/**
 * Élèves et tuteurs éligibles pour une séance (même établissement, matière, disponibilité).
 * GET /sessions/:sessionId/assignment-candidates
 */
export const getAssignmentCandidates = async (
  sessionId: string,
): Promise<AssignmentCandidatesResponse> => {
  const { data } = await apiClient.get<AssignmentCandidatesResponse>(
    `/sessions/${sessionId}/assignment-candidates`,
  );
  return data;
};

/**
 * Définit les binômes élève–tuteur pour la séance (remplace toutes les binômes existantes).
 * Toutes les binômes créées ont la source `manual`.
 * PUT /sessions/:sessionId/assignments
 */
export const setSessionAssignments = async (
  sessionId: string,
  dto: SetAssignmentsDto,
): Promise<SessionStudentTutorPair[]> => {
  const { data } = await apiClient.put<SessionStudentTutorPair[]>(
    `/sessions/${sessionId}/assignments`,
    dto,
  );
  return data;
};

/**
 * Affectation automatique : conserve les binômes déjà en `manual`, complète le reste
 * (binôme cœur explicite / implicite ≥5 séances, puis équilibrage).
 * POST /sessions/:sessionId/assignments/auto
 */
export const runSessionAutoAssignment = async (
  sessionId: string,
  participants?: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
): Promise<SessionStudentTutorPair[]> => {
  const { data } = await apiClient.post<SessionStudentTutorPair[]>(
    `/sessions/${sessionId}/assignments/auto`,
    { participants },
  );
  return data;
};

/**
 * Propose une affectation automatique pour une séance EXISTANTE — rien n'est persisté.
 * POST /sessions/:sessionId/assignments/auto/propose
 */
export const proposeSessionAutoAssignment = async (
  sessionId: string,
  participants?: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
): Promise<AutoAssignmentProposal> => {
  const { data } = await apiClient.post<AutoAssignmentProposal>(
    `/sessions/${sessionId}/assignments/auto/propose`,
    { participants },
  );
  return data;
};

/**
 * Propose une affectation automatique pour une séance PAS ENCORE CRÉÉE (flux de création).
 * Le client fournit tout le contexte (type, établissement, sujet, activité, participants)
 * et le backend renvoie les paires proposées sans rien persister.
 * POST /sessions/assignments/auto/propose-draft
 */
export const proposeDraftAutoAssignment = async (
  dto: ProposeDraftAutoAssignmentDto,
): Promise<AutoAssignmentProposal> => {
  const { data } = await apiClient.post<AutoAssignmentProposal>(
    `/sessions/assignments/auto/propose-draft`,
    dto,
  );
  return data;
};

// --- Binômes cœur (table core_pairs) ---

/**
 * Crée un binôme cœur pour l’entreprise courante.
 * POST /companies/current/binome-coeur
 */
export const createBinomeCoeur = async (dto: CreateBinomeCoeurDto): Promise<BinomeCoeur> => {
  const { data } = await apiClient.post<BinomeCoeur>(COMPANY_BINOME_COEUR, dto);
  return data;
};

/**
 * Liste les binômes cœur (filtres optionnels établissement / matière).
 * GET /companies/current/binome-coeur
 */
export const listBinomeCoeur = async (filters?: ListBinomeCoeurQuery): Promise<BinomeCoeur[]> => {
  const params = new URLSearchParams();
  if (filters?.establishmentId) params.append('establishmentId', filters.establishmentId);
  if (filters?.subjectId) params.append('subjectId', filters.subjectId);
  const qs = params.toString();
  const url = qs ? `${COMPANY_BINOME_COEUR}?${qs}` : COMPANY_BINOME_COEUR;
  const { data } = await apiClient.get<BinomeCoeur[]>(url);
  return data;
};

/**
 * Supprime un binôme cœur.
 * DELETE /companies/current/binome-coeur/:id
 */
export const deleteBinomeCoeur = async (id: string): Promise<void> => {
  await apiClient.delete(`${COMPANY_BINOME_COEUR}/${id}`);
};
