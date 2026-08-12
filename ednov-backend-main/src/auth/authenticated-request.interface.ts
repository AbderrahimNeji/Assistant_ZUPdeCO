import { Request } from 'express';
import { VisibilityScope } from '../common/visibility/visibility-scope.types';

export interface AuthenticatedUser {
  uid: string;
  firebaseUid?: string;
  company_id: string;
  roles: string[];
}

/**
 * Typed HTTP request after FirebaseJwtGuard + VisibilityScopeInterceptor have run.
 * - `user` is guaranteed by FirebaseJwtGuard.
 * - `visibilityScope` is attached by VisibilityScopeInterceptor when @LinkedElement is present,
 *   null otherwise.
 * - `actionScopes` is attached by ActionScopesInterceptor when @WithActionScopes or @WriteScope is present.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  visibilityScope?: VisibilityScope | null;
  actionScopes?: Record<string, VisibilityScope | null>;
}
