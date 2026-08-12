import { SetMetadata } from '@nestjs/common';
import { LINKED_ELEMENT_KEY } from './visibility-scope.types';

export interface LinkedElementMeta {
  elementId: string;
  interfaceName: string;
}

/**
 * Declares which sidebar menu element (interface_elements) this GET route corresponds to.
 * Used by VisibilityScopeInterceptor to load and attach the visibility scope for the
 * connected user's role before the handler executes.
 *
 * @param elementId  The element_id in interface_elements (e.g. 'menu-sessions')
 * @param interfaceName  The interface_name (e.g. 'sidebar')
 *
 * @example
 * @Get()
 * @LinkedElement('menu-sessions', 'sidebar')
 * findAll(@Query() query, @Request() req) { ... }
 */
export const LinkedElement = (elementId: string, interfaceName: string) =>
  SetMetadata(LINKED_ELEMENT_KEY, { elementId, interfaceName } satisfies LinkedElementMeta);
