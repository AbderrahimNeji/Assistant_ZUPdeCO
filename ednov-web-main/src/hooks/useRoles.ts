import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoles,
  fetchRole,
  createRole,
  updateRole,
  deleteRole,
  fetchRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
  fetchRoleInterfaceBindings,
  replaceRoleInterfaceBindings,
} from '@/services/roles.service';
import type {
  CreateRolePayload,
  UpdateRolePayload,
  CreateRoleGroupPayload,
  UpdateRoleGroupPayload,
  RoleBinding,
} from '@/types/role.types';

const ROLES_KEY = ['roles'] as const;
const ROLE_GROUPS_KEY = ['roles', 'groups'] as const;
const ROLE_BINDINGS_KEY = (roleId: string) => ['roles', roleId, 'bindings'] as const;

// ─── Roles ───────────────────────────────────────────────────────────────────

export const useRoles = () => {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: fetchRoles,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useRole = (id: string | null | undefined) => {
  return useQuery({
    queryKey: [...ROLES_KEY, id],
    queryFn: () => fetchRole(id!),
    enabled: !!id,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
};

// ─── Role Groups ─────────────────────────────────────────────────────────────

export const useRoleGroups = () => {
  return useQuery({ queryKey: ROLE_GROUPS_KEY, queryFn: fetchRoleGroups });
};

export const useCreateRoleGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoleGroupPayload) => createRoleGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_GROUPS_KEY });
    },
  });
};

export const useUpdateRoleGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoleGroupPayload }) =>
      updateRoleGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_GROUPS_KEY });
    },
  });
};

export const useDeleteRoleGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoleGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_GROUPS_KEY });
    },
  });
};

// ─── Role Interface Bindings ─────────────────────────────────────────────────

export const useRoleInterfaceBindings = (roleId: string | null | undefined) => {
  return useQuery({
    queryKey: roleId ? ROLE_BINDINGS_KEY(roleId) : ['roles', 'bindings', 'disabled'],
    queryFn: () => fetchRoleInterfaceBindings(roleId!),
    enabled: !!roleId,
  });
};

export const useReplaceRoleBindings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, bindings }: { roleId: string; bindings: RoleBinding[] }) =>
      replaceRoleInterfaceBindings(roleId, bindings),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ROLE_BINDINGS_KEY(variables.roleId) });
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
};
