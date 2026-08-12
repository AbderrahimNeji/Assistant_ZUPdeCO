import { SetMetadata } from '@nestjs/common';

export const WRITE_SCOPE_KEY = 'write_scope';
export const ACTION_SCOPES_KEY = 'action_scopes';

export interface ActionScopeMeta {
  elementId: string;
  interfaceName: string;
}

/**
 * Decorator for mutation endpoints (POST, PATCH, DELETE).
 * Resolves the write scope for a single action and attaches it to req.actionScopes.
 * 
 * @param elementId The action element_id (e.g. 'action-cancel-row')
 * @param interfaceName The interface name (e.g. 'sessions')
 * 
 * @example
 * @Post(':id/cancel')
 * @WriteScope('action-cancel-row', 'sessions')
 * async cancel(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
 *   await this.service.assertAccess(id, req.actionScopes?.['action-cancel-row']);
 * }
 */
export const WriteScope = (elementId: string, interfaceName: string) =>
  SetMetadata(WRITE_SCOPE_KEY, { elementId, interfaceName } satisfies ActionScopeMeta);

/**
 * Decorator for list endpoints (GET).
 * Resolves write scopes for multiple actions and attaches them to req.actionScopes.
 * Used to compute per-row _permissions.
 * 
 * @param actions Array of action metadata to resolve
 * 
 * @example
 * @Get()
 * @LinkedElement('menu-sessions', 'sidebar')
 * @WithActionScopes([
 *   { elementId: 'action-edit-row', interfaceName: 'sessions' },
 *   { elementId: 'action-cancel-row', interfaceName: 'sessions' },
 * ])
 * findAll(@Request() req: AuthenticatedRequest) {
 *   return this.service.findAll(..., req.actionScopes);
 * }
 */
export const WithActionScopes = (actions: ActionScopeMeta[]) =>
  SetMetadata(ACTION_SCOPES_KEY, actions);
