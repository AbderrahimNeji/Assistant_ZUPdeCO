import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { getTutors, getStudents, getVolunteers } from '@/services/users.service';
import { useAuthStore } from '@/stores/authStore';
import type { UserWithProfile } from '@/types/user.types';
import { getUserRoleGroup, VOLUNTEER_ROLE_CODES } from '@/types/user.types';
import type { StudentFilters } from '@/components/students/student-configs';
import {
  tutorDisponibiliteKeysToAvailabilityDays,
  type TutorFilters,
} from '@/components/tutors/tutor-configs';
import { useRoles } from '@/hooks/useRoles';

interface UseUsersSearchParams {
  role?: 'tutor' | 'student';
  excludedIds?: string[];
  pageSize?: number;
  filters?: StudentFilters | TutorFilters;
}

export const useUsersSearch = ({
  role,
  excludedIds = [],
  pageSize = 5,
  filters,
}: UseUsersSearchParams = {}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const currentUser = useAuthStore((state) => state.user);
  const userRoles = useAuthStore((state) => state.roles);
  const { data: allRoles = [] } = useRoles();

  const isVolunteerRoleCode = React.useCallback(
    (code: string): boolean => {
      const fullRole = allRoles.find((r) => r.code === code);
      if (fullRole) return fullRole.roleGroup === 'volunteers';
      return (VOLUNTEER_ROLE_CODES as readonly string[]).includes(code.toLowerCase());
    },
    [allRoles],
  );

  const isCurrentUserVolunteer = useMemo(() => {
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some((ur) => isVolunteerRoleCode(ur.code));
  }, [userRoles, isVolunteerRoleCode]);

  const excludedIdsKey = useMemo(
    () => (excludedIds.length > 0 ? [...excludedIds].sort().join(',') : ''),
    [excludedIds],
  );

  const adjustedPageSize = useMemo(() => {
    if (
      role === 'tutor' &&
      isCurrentUserVolunteer &&
      currentUser &&
      !excludedIds.includes(currentUser.id)
    ) {
      return pageSize - 1;
    }
    return pageSize;
  }, [role, isCurrentUserVolunteer, currentUser, excludedIds, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users-search', role, searchQuery, page, adjustedPageSize, excludedIdsKey, filters],
    queryFn: async () => {
      const baseParams = {
        search: searchQuery,
        page,
        pageSize: adjustedPageSize,
        excludeIds: excludedIds,
      };

      if (role === 'tutor') {
        const tutorFilters = filters as TutorFilters | undefined;
        const availabilityDays = tutorDisponibiliteKeysToAvailabilityDays(
          tutorFilters?.disponibilite ?? [],
        );

        const queryParams = {
          ...baseParams,
          statuses: tutorFilters?.statuses?.length ? tutorFilters.statuses : undefined,
          subjectIds: tutorFilters?.subjects?.length ? tutorFilters.subjects : undefined,
          establishmentId: tutorFilters?.establishmentId,
          availabilityDays: availabilityDays.length > 0 ? availabilityDays : undefined,
        };

        const [tutorsResponse, volunteersResponse] = await Promise.all([
          getTutors(queryParams),
          getVolunteers(queryParams),
        ]);

        const allUsers = [...tutorsResponse.data];
        const existingIds = new Set(allUsers.map((u) => u.id));

        for (const volunteer of volunteersResponse.data) {
          if (!existingIds.has(volunteer.id)) {
            allUsers.push(volunteer);
          }
        }

        const combinedTotal = tutorsResponse.total + volunteersResponse.total;

        return {
          data: allUsers,
          total: combinedTotal,
          hasMore: page * adjustedPageSize < combinedTotal,
        };
      } else if (role === 'student') {
        const studentFilters = filters as StudentFilters | undefined;
        const response = await getStudents({
          ...baseParams,
          statuses: studentFilters?.statuses?.length ? studentFilters.statuses : undefined,
          subjectIds: studentFilters?.subjects?.length ? studentFilters.subjects : undefined,
          levelIds: studentFilters?.levelIds?.length ? studentFilters.levelIds : undefined,
          establishmentId: studentFilters?.establishmentId,
          classIds: studentFilters?.classIds?.length ? studentFilters.classIds : undefined,
          specialtyIds: studentFilters?.specialtyIds?.length
            ? studentFilters.specialtyIds
            : undefined,
          dateFrom: studentFilters?.createdFrom,
          dateTo: studentFilters?.createdTo,
        });
        return {
          data: response.data,
          total: response.total,
          hasMore: page * adjustedPageSize < response.total,
        };
      }
      return { data: [], total: 0, hasMore: false };
    },
    enabled: searchQuery.length >= 0 && !!role,
    staleTime: 2 * 60 * 1000,
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (data?.hasMore) {
      setPage((p) => p + 1);
    }
  }, [data?.hasMore]);

  const handleNextPage = useCallback(() => {
    if (data?.hasMore) {
      setPage((p) => p + 1);
    }
  }, [data?.hasMore]);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const usersWithRole: UserWithProfile[] = useMemo(() => {
    return (data?.data || []).map((user) => ({
      ...user,
      currentRole:
        role === 'tutor'
          ? getUserRoleGroup(user) === 'volunteers'
            ? ('volunteer' as const)
            : ('tutor' as const)
          : ('student' as const),
    }));
  }, [data?.data, role]);

  const enrichedCurrentUserRoles = useMemo(
    () =>
      userRoles.map((r) => {
        const fullRole = allRoles.find((fr) => fr.code === r.code);
        return {
          roleId: r.id,
          role: { id: r.id, code: r.code, label: r.label, roleGroup: fullRole?.roleGroup },
        };
      }),
    [userRoles, allRoles],
  );

  const users = useMemo(() => {
    if (role !== 'tutor' || !isCurrentUserVolunteer || !currentUser) {
      return usersWithRole;
    }

    if (excludedIds.includes(currentUser.id)) {
      return usersWithRole;
    }

    const currentUserInList = usersWithRole.find((u) => u.id === currentUser.id);
    if (currentUserInList) {
      const rest = usersWithRole.filter((u) => u.id !== currentUser.id);
      return [
        { ...currentUserInList, userRoles: enrichedCurrentUserRoles, isPinned: true },
        ...rest,
      ];
    }

    const pinnedUser: UserWithProfile = {
      id: currentUser.id,
      companyId: currentUser.companyId,
      firebaseUid: currentUser.firebaseUid,
      email: currentUser.email,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      displayName: currentUser.displayName,
      photoUrl: currentUser.photoUrl,
      phone: currentUser.phone,
      status: currentUser.status,
      userRoles: enrichedCurrentUserRoles,
      currentRole: 'volunteer',
      isPinned: true,
      createdAt: currentUser.createdAt || new Date(),
      updatedAt: currentUser.updatedAt || new Date(),
    };
    return [pinnedUser, ...usersWithRole];
  }, [
    role,
    isCurrentUserVolunteer,
    currentUser,
    enrichedCurrentUserRoles,
    usersWithRole,
    excludedIds,
  ]);

  return {
    users,
    isLoading,
    error,
    hasMore: data?.hasMore || false,
    total: data?.total || 0,
    page,
    onSearch: handleSearch,
    onLoadMore: handleLoadMore,
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    searchQuery,
  };
};
