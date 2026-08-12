import type { QueryClient } from '@tanstack/react-query';
import type { Student } from '@/types/student.types';
import type { Tutor } from '@/types/tutor.types';
import type { UserWithProfile } from '@/types/user.types';

type UsersSearchPage = {
  data: UserWithProfile[];
  total: number;
  hasMore?: boolean;
};

/** Affiche le nouvel utilisateur en tête des colonnes latérales (sans l’ajouter aux Participants). */
export function prependUserToUsersSearchCaches(
  queryClient: QueryClient,
  role: 'tutor' | 'student',
  user: UserWithProfile,
): void {
  if (!user.id) return;

  queryClient.setQueriesData<UsersSearchPage>({ queryKey: ['users-search', role] }, (old) => {
    if (!old?.data?.length) {
      return { data: [user], total: 1, hasMore: false };
    }
    if (old.data.some((u) => u.id === user.id)) return old;
    return {
      ...old,
      data: [user, ...old.data],
      total: old.total + 1,
    };
  });
}

/** POST /users (élève) — extrait l'utilisateur si la réponse est encapsulée. */
export function extractCreatedUserFromApiResponse<T extends { id: string }>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Réponse API invalide après création utilisateur');
  }

  const record = payload as Record<string, unknown>;

  if (record.user && typeof record.user === 'object' && record.user !== null) {
    const nested = record.user as T;
    if (nested.id) return nested;
  }

  if (typeof record.id === 'string' && record.id.length > 0) {
    return payload as T;
  }

  throw new Error('Réponse API sans identifiant utilisateur après création');
}

export function tutorToUserWithProfile(tutor: Tutor): UserWithProfile {
  const code = tutor.userRoles?.[0]?.role?.code?.toLowerCase() ?? '';
  const currentRole = code.includes('volunteer') ? ('volunteer' as const) : ('tutor' as const);
  return {
    id: tutor.id,
    companyId: tutor.companyId,
    firebaseUid: tutor.firebaseUid ?? '',
    email: tutor.email,
    firstName: tutor.firstName,
    lastName: tutor.lastName,
    displayName: tutor.displayName,
    photoUrl: tutor.photoUrl,
    phone: tutor.phone,
    status: tutor.status,
    hoursDone: tutor.hoursDone,
    createdAt: tutor.createdAt ?? new Date(),
    updatedAt: tutor.updatedAt ?? new Date(),
    currentRole,
    userProfiles: tutor.userProfiles?.map((p) => ({
      ...p,
      id: p.profileId ?? undefined,
    })),
  };
}

export function studentToUserWithProfile(student: Student): UserWithProfile {
  return {
    id: student.id,
    companyId: student.companyId,
    firebaseUid: '',
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    displayName: student.displayName,
    photoUrl: student.photoUrl,
    phone: student.phone,
    status: student.status,
    createdAt: student.createdAt ? new Date(student.createdAt) : new Date(),
    updatedAt: student.updatedAt ? new Date(student.updatedAt) : new Date(),
    currentRole: 'student',
    userProfiles: student.userProfiles?.map((p) => ({
      ...p,
      id: p.profileId ?? undefined,
    })),
  };
}
