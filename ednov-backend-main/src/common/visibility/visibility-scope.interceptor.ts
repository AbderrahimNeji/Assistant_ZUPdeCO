import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { LINKED_ELEMENT_KEY } from './visibility-scope.types';
import type { LinkedElementMeta } from './linked-element.decorator';
import { InterfaceElement } from '../../modules/interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../../modules/interface-elements/entities/role-interface-element.entity';

interface RequestUser {
  uid?: string;
  company_id?: string;
  roles?: string[];
}

/**
 * Global interceptor that runs after guards (FirebaseJwtGuard, RolesGuard).
 *
 * When a controller method is decorated with @LinkedElement(elementId, interfaceName):
 *  1. Reads the element_id + interface_name from metadata.
 *  2. Fetches the matching interface_elements row (element_type = 'menu').
 *  3. Fetches the role_interface_elements row for the connected user's role.
 *  4. Attaches rie.visibilityScope to req.visibilityScope.
 *
 * If no @LinkedElement is present or no matching DB row is found,
 * req.visibilityScope is set to null (no restriction applied).
 */
@Injectable()
export class VisibilityScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(VisibilityScopeInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(InterfaceElement)
    private readonly ieRepository: Repository<InterfaceElement>,
    @InjectRepository(RoleInterfaceElement)
    private readonly rieRepository: Repository<RoleInterfaceElement>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();

    // Default: no scope restriction
    req.visibilityScope = null;

    const meta = this.reflector.get<LinkedElementMeta | undefined>(
      LINKED_ELEMENT_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle();

    const roleCodes = req.user?.roles;
    const companyId = req.user?.company_id;

    if (!roleCodes?.length || !companyId) return next.handle();

    try {
      // Find the interface_elements row for this menu item.
      // Use a JOIN to match role_interface_elements for the user's role in one query.
      // NOTE: Visibility scopes are ONLY loaded for element_type='menu' (module-level access).
      // Actions (create/update/delete) do not have scopes — they are simple ON/OFF permissions.
      // The scope from the menu is applied to READ operations (list, detail, export).
      //
      // A user may have several roles bound to the same menu: `getRawOne()` without ORDER BY
      // was non-deterministic (PostgreSQL), so one role could win over another arbitrarily
      // (e.g. unrestricted vs same_establishment). We resolve deterministically using
      // roles.hierarchy_level (1 = highest authority), then role code.
      const roleCodesLc = roleCodes.map((c) => (c ?? '').toLowerCase());
      const rie = await this.rieRepository
        .createQueryBuilder('rie')
        .innerJoin('rie.element', 'ie')
        .innerJoin('rie.role', 'r')
        .select('rie.visibility_scope', 'visibilityScope')
        .where('ie.element_id = :elementId', { elementId: meta.elementId })
        .andWhere('ie.interface_name = :interfaceName', { interfaceName: meta.interfaceName })
        .andWhere('ie.element_type = :elementType', { elementType: 'menu' })
        .andWhere('ie.deleted_at IS NULL')
        .andWhere('LOWER(r.code) IN (:...roleCodesLc)', { roleCodesLc })
        .andWhere('r.company_id = :companyId', { companyId })
        .andWhere('r.deleted_at IS NULL')
        .andWhere('rie.company_id = :companyId', { companyId })
        .orderBy('COALESCE(r.hierarchy_level, 2147483647)', 'ASC')
        .addOrderBy('r.code', 'ASC')
        .getRawOne<{ visibilityScope: RoleInterfaceElement['visibilityScope'] }>();

      req.visibilityScope = rie?.visibilityScope ?? null;

      this.logger.debug(
        `[${meta.elementId}] role(s)=${roleCodes.join(',')} → scope=${req.visibilityScope?.scope ?? 'null'}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to resolve visibility scope for element '${meta.elementId}': ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Non-fatal: proceed without restricting
    }

    return next.handle();
  }
}
