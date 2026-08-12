import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchUserPreferences, updateNotificationPreferences } from '@/services/userPreferences';
import type { NotificationPreferences } from '@/types/userPreferences';
import { useAuth } from '@/providers/AuthProvider';

export function useUserPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['userPreferences'],
    queryFn: fetchUserPreferences,
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ current, notifications }: { current: Awaited<ReturnType<typeof fetchUserPreferences>>; notifications: NotificationPreferences }) =>
      updateNotificationPreferences(current, notifications),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
    },
  });
}
