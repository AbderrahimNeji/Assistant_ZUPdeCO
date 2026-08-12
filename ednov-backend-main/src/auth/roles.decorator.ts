import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict route to users that have at least one of the given role codes.
 * Use with RolesGuard. If not applied, no role check is performed.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
