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
import { WRITE_SCOPE_KEY, ACTION_SCOPES_KEY, ActionScopeMeta } from './action-scope.decorator';
import { InterfaceElement } from '../../modules/interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../../modules/interface-elements/entities/role-interface-element.entity';
import type { VisibilityScope } from './visibility-scope.types';

interface RequestUser {
  uid?: string;
  company_id?: string;
  roles?: string[];
}

/**
 * Global interceptor that runs after VisibilityScopeInterceptor.
 * 
 * Resolves write scopes for actions declared with @WriteScope or @WithActionScopes.
 * Attaches req.actionScopes: Record<actionId, VisibilityScope | null>.
 * 
 * For @WriteScope (mutations): resolves a single action.
 * For @WithActionScopes (lists): resolves multiple actions for per-row _permissions.
 */
@Injectable()
export class ActionScopesInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActionScopesInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(InterfaceElement)
    private readonly ieRepository: Repository<InterfaceElement>,
    @InjectRepository(RoleInterfaceElement)
    private readonly rieRepository: Repository<RoleInterfaceElement>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser; actionScopes?: Record<string, VisibilityScope | null> }>();

    // Check for @WriteScope (single action)
    const writeScopeMeta = this.reflector.get<ActionScopeMeta | undefined>(
      WRITE_SCOPE_KEY,
      context.getHandler(),
    );

    // Check for @WithActionScopes (multiple actions)
    const actionScopesMeta = this.reflector.get<ActionScopeMeta[] | undefined>(
      ACTION_SCOPES_KEY,
      context.getHandler(),
    );

    if (!writeScopeMeta && !actionScopesMeta) {
      return next.handle();
    }

    const roleCodes = req.user?.roles;
    const companyId = req.user?.company_id;

    if (!roleCodes?.length || !companyId) {
      return next.handle();
    }

    // Collect all actions to resolve
    const actionsToResolve: ActionScopeMeta[] = [];
    if (writeScopeMeta) {
      actionsToResolve.push(writeScopeMeta);
    }
    if (actionScopesMeta) {
      actionsToResolve.push(...actionScopesMeta);
    }

    req.actionScopes = {};

    try {
      const roleCodesLc = roleCodes.map((c) => (c ?? '').toLowerCase());

      // Resolve each action's write scope
      for (const actionMeta of actionsToResolve) {
        const rie = await this.rieRepository
          .createQueryBuilder('rie')
          .innerJoin('rie.interfaceElement', 'ie')
          .innerJoin('rie.role', 'r')
          .select('rie.visibility_scope', 'visibilityScope')
          .where('ie.element_id = :elementId', { elementId: actionMeta.elementId })
          .andWhere('ie.interface_name = :interfaceName', { interfaceName: actionMeta.interfaceName })
          .andWhere('ie.element_type = :elementType', { elementType: 'action' })
          .andWhere('ie.deleted_at IS NULL')
          .andWhere('LOWER(r.code) IN (:...roleCodesLc)', { roleCodesLc })
          .andWhere('r.company_id = :companyId', { companyId })
          .andWhere('r.deleted_at IS NULL')
          .andWhere('rie.company_id = :companyId', { companyId })
          .orderBy('COALESCE(r.hierarchy_level, 2147483647)', 'ASC')
          .addOrderBy('r.code', 'ASC')
          .getRawOne<{ visibilityScope: VisibilityScope | null }>();

        req.actionScopes[actionMeta.elementId] = rie?.visibilityScope ?? null;
      }

      this.logger.debug(
        `Resolved ${actionsToResolve.length} action scope(s) for roles: ${roleCodes.join(',')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to resolve action scopes: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Non-fatal: proceed with empty actionScopes
    }

    return next.handle();
  }
}
