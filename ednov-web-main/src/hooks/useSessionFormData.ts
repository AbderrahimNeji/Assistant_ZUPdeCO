import { useQuery } from '@tanstack/react-query';
import {
  getEstablishments,
  getRooms,
  getLevels,
  getSubjects,
  getPrograms,
  getActivities,
} from '@/services/academic.service';

export const useSessionFormData = () => {
  const establishments = useQuery({
    queryKey: ['establishments'],
    queryFn: () => getEstablishments(),
    staleTime: 10 * 60 * 1000,
  });

  const rooms = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
    staleTime: 10 * 60 * 1000,
  });

  const levels = useQuery({
    queryKey: ['levels'],
    queryFn: async () => {
      const response = await getLevels();
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const subjects = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const programs = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const response = await getPrograms();
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const activities = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const response = await getActivities();
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    establishments: establishments.data?.data || [],
    rooms: rooms.data || [],
    levels: levels.data || [],
    subjects: subjects.data || [],
    programs: programs.data || [],
    activities: activities.data || [],
    isLoading:
      establishments.isLoading ||
      rooms.isLoading ||
      levels.isLoading ||
      subjects.isLoading ||
      programs.isLoading ||
      activities.isLoading,
  };
};
