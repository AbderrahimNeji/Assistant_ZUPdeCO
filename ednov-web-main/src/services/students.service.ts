import { apiClient } from './api-client';
import { extractCreatedUserFromApiResponse } from '@/utils/created-user-profile';
import type { Student, CreateStudentDto, UpdateStudentDto } from '@/types/student.types';
import type { StudentAccountStatus } from '@/types/user.types';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

/**
 * Interface pour un élément de la liste d'élèves (version allégée)
 */
export interface StudentListItem {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  status: StudentAccountStatus;
  userProfiles?: Array<{
    levelId?: string | null;
    subjects?: unknown[] | null;
  }>;
}

/**
 * Interface pour la réponse paginée de GET /users (filtered by student role)
 */
export interface StudentsResponse {
  data: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ══════════════════════════════════════════════════════
// FONCTIONS EXPORTÉES
// ══════════════════════════════════════════════════════

/**
 * Crée un nouvel élève
 *
 * @param dto - Objet CreateStudentDto avec tous les champs nécessaires
 * @returns Promise<Student> - Élève créé
 */
export const createStudent = async (dto: CreateStudentDto): Promise<Student> => {
  const response = await apiClient.post('/users', dto);
  return extractCreatedUserFromApiResponse<Student>(response.data);
};

/**
 * Modifie un élève existant
 *
 * @param id - ID de l'élève à modifier
 * @param dto - Objet UpdateStudentDto avec les champs à mettre à jour (partiel)
 * @returns Promise<Student> - Élève mis à jour
 */
export const updateStudent = async (id: string, dto: UpdateStudentDto): Promise<Student> => {
  const response = await apiClient.patch<Student>(`/users/${id}`, dto);
  return response.data;
};

/**
 * Supprime un élève
 *
 * @param id - ID de l'élève à supprimer
 * @returns Promise<void> - Pas de contenu de réponse
 */
export const deleteStudent = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};

/**
 * Interface pour le résultat de l'import CSV
 */
export interface ImportCsvError {
  rowNumber: number;
  email?: string;
  reason: string;
  rawRow?: Record<string, string>;
}

export interface ImportCsvResult {
  totalRows: number;
  importedCount: number;
  skippedExistingEmailCount: number;
  invalidCount: number;
  errors: ImportCsvError[];
}

/**
 * Importe des élèves à partir d'un fichier CSV
 *
 * @param file - Fichier CSV à importer
 * @param options - Options d'import (defaultProfileId, defaultRoleId, dryRun)
 * @returns Promise<ImportCsvResult> - Résultat de l'import
 */
export const importStudentsCsv = async (
  file: File,
  options?: {
    defaultProfileId?: string;
    defaultRoleId?: string;
    dryRun?: boolean;
  },
): Promise<ImportCsvResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const queryParams = new URLSearchParams();
  if (options?.defaultProfileId) {
    queryParams.append('defaultProfileId', options.defaultProfileId);
  }
  if (options?.defaultRoleId) {
    queryParams.append('defaultRoleId', options.defaultRoleId);
  }
  if (options?.dryRun) {
    queryParams.append('dryRun', 'true');
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/users/import-csv?${queryString}` : '/users/import-csv';

  const response = await apiClient.post<ImportCsvResult>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
