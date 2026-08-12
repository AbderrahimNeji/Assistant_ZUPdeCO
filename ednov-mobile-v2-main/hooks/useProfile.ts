import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { useAuth } from '@/providers/AuthProvider';
import type { CriminalRecordInfo, TutorPlatformStatus, TutorProfile } from '@/types/profile';
import { getStaticProfile } from '@/data/staticData';
import { fetchLoginProfile } from '@/services/auth';
import { updateProfile, type UpdateProfilePayload } from '@/services/profile';

/** Fetch profile from GET /users/login (backend API). */
async function fetchProfileFromApi(): Promise<TutorProfile> {
  const login = await fetchLoginProfile();
  const raw = login as unknown as Record<string, unknown>;
  const company = raw.company as Record<string, unknown> | undefined;
  const criminalRecord = (raw.criminalRecord as CriminalRecordInfo | null | undefined) ?? null;
  const tutorPlatformStatus = (raw.tutorPlatformStatus as TutorPlatformStatus | undefined) ?? 'active';
  return {
    id: (raw.id as string | null) ?? null,
    avatarUrl: (raw.photoUrl as string | null) ?? (raw.avatarUrl as string | null) ?? null,
    firstName: (raw.firstName as string) ?? '',
    lastName: (raw.lastName as string) ?? '',
    createdAt: (raw.createdAt as string) ?? '',
    phone: (raw.phone as string | null) ?? null,
    establishment: (company?.name as string | null) ?? (raw.establishment as string | null) ?? null,
    engagement: (raw.engagement as TutorProfile['engagement']) ?? [],
    criminalRecord,
    tutorPlatformStatus,
  };
}

function fetchProfile(): Promise<TutorProfile> {
  if (env.useStaticData) return Promise.resolve(getStaticProfile());
  if (env.apiUrl) return fetchProfileFromApi();
  return Promise.resolve(getStaticProfile());
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: !!user,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || env.useStaticData || !env.apiUrl?.trim()) return false;
      return d.criminalRecord?.status === 'pending' ? 45_000 : false;
    },
  });
}

/** Fetches login profile (companyId, roleCodes, etc.) from GET /users/login.
 *  Always enabled when the user is signed in so companyId stays fresh if an admin
 *  re-assigns the user to a different company between sessions. */
export function useLoginProfile(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['loginProfile'],
    queryFn: fetchLoginProfile,
    enabled: enabled && !!user,
    staleTime: 10 * 60 * 1000, // 10 min — company assignments rarely change mid-session
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
