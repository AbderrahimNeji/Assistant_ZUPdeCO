import { useQuery } from '@tanstack/react-query';
import {
  getTutors,
  getTutor,
  getStudents,
  getStudent,
  getVolunteers,
  getVolunteer,
  getAdmins,
  getAdmin,
  getManagers,
  getManager,
  getCoordinators,
  getCoordinator,
  getSuperadmins,
  getSuperadmin,
} from '@/services/users.service';

interface UseUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  excludeIds?: string[];
}

// Tutors
export const useTutors = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'tutors', params],
    queryFn: () => getTutors(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTutor = (id: string) => {
  return useQuery({
    queryKey: ['users', 'tutors', id],
    queryFn: () => getTutor(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Students
export const useStudents = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'students', params],
    queryFn: () => getStudents(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ['users', 'students', id],
    queryFn: () => getStudent(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Volunteers
export const useVolunteers = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'volunteers', params],
    queryFn: () => getVolunteers(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useVolunteer = (id: string) => {
  return useQuery({
    queryKey: ['users', 'volunteers', id],
    queryFn: () => getVolunteer(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Admins
export const useAdmins = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'admins', params],
    queryFn: () => getAdmins(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAdmin = (id: string) => {
  return useQuery({
    queryKey: ['users', 'admins', id],
    queryFn: () => getAdmin(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Managers
export const useManagers = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'managers', params],
    queryFn: () => getManagers(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useManager = (id: string) => {
  return useQuery({
    queryKey: ['users', 'managers', id],
    queryFn: () => getManager(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Coordinators
export const useCoordinators = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'coordinators', params],
    queryFn: () => getCoordinators(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCoordinator = (id: string) => {
  return useQuery({
    queryKey: ['users', 'coordinators', id],
    queryFn: () => getCoordinator(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Superadmins
export const useSuperadmins = (params?: UseUsersParams) => {
  return useQuery({
    queryKey: ['users', 'superadmins', params],
    queryFn: () => getSuperadmins(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSuperadmin = (id: string) => {
  return useQuery({
    queryKey: ['users', 'superadmins', id],
    queryFn: () => getSuperadmin(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
