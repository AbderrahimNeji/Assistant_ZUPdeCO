import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { AuditLogService } from '../audit/audit.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';
import { buildXlsxBuffer } from '../../common/utils/excel-export.util';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly repository: Repository<Activity>,
    private readonly auditLogService: AuditLogService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  async create(
    companyId: string,
    dto: CreateActivityDto,
    actorId?: string,
  ): Promise<Activity> {
    const existing = await this.repository.findOne({
      where: { companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Activity with code "${dto.code}" already exists for this company`,
      );
    }
    const entity = this.repository.create({
      ...dto,
      companyId,
    });
    const saved = await this.repository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'activities',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAll(
    companyId: string,
    query: any,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Activity>> {
    const { page = 1, pageSize = 20, statuses, activityTypeIds, hasChat, hasBot, hasLink, canHaveCr, search } = query;
    const statusList = Array.isArray(statuses)
      ? statuses
      : typeof statuses === 'string' && statuses
        ? [statuses]
        : [];
    const activityTypeList = Array.isArray(activityTypeIds)
      ? activityTypeIds
      : typeof activityTypeIds === 'string' && activityTypeIds
        ? [activityTypeIds]
        : [];
    const { skip, take } = getSkipTake(page, pageSize);
    
    const qb = this.repository
      .createQueryBuilder('activity')
      .where('activity.company_id = :companyId', { companyId })
      .orderBy('activity.label', 'ASC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'activities',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (statusList.length > 0) {
      qb.andWhere('activity.status IN (:...statusList)', { statusList });
    }

    if (activityTypeList.length > 0) {
      qb.andWhere('activity.activityTypeId IN (:...activityTypeList)', { activityTypeList });
    }

    if (hasChat !== undefined && hasChat !== null) {
      qb.andWhere('activity.chat = :hasChat', { hasChat });
    }

    if (hasBot !== undefined && hasBot !== null) {
      qb.andWhere('activity.bot = :hasBot', { hasBot });
    }

    if (hasLink !== undefined && hasLink !== null) {
      qb.andWhere('activity.withLink = :hasLink', { hasLink });
    }

    if (canHaveCr !== undefined && canHaveCr !== null) {
      qb.andWhere('activity.canHasCr = :canHaveCr', { canHaveCr });
    }

    if (search && search.trim().length > 0) {
      qb.andWhere(
        '(LOWER(activity.label) LIKE LOWER(:search) OR LOWER(activity.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }
    
    qb.skip(skip).take(take);
    
    const [data, total] = await qb.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((a) => a.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'activity.id',
              scope,
              'activities',
              scopeUser || { userId: '', companyId },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((a) => {
        (a as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(a.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOne(id: string, companyId: string): Promise<Activity> {
    const entity = await this.repository.findOne({
      where: { id, companyId },
    });
    if (!entity) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    return entity;
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateActivityDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<Activity> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.repository
        .createQueryBuilder('activity')
        .where('activity.id = :id', { id })
        .andWhere('activity.company_id = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'activities',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this activity');
      }
    }

    const entity = await this.findOne(id, companyId);
    if (dto.code !== undefined && dto.code !== entity.code) {
      const existing = await this.repository.findOne({
        where: { companyId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Activity with code "${dto.code}" already exists for this company`,
        );
      }
    }
    const oldValue = { ...entity } as unknown as Record<string, unknown>;
    Object.assign(entity, dto);
    const saved = await this.repository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'activities',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async remove(
    id: string,
    companyId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérifier l'accès avant suppression
    if (actorId && writeScope !== undefined) {
      const qb = this.repository
        .createQueryBuilder('activity')
        .where('activity.id = :id', { id })
        .andWhere('activity.company_id = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'activities',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this activity');
      }
    }

    await this.findOne(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'activities',
      entityId: id,
      action: 'DELETE',
      oldValue: { id } as Record<string, unknown>,
    });
    await this.repository.softDelete(id);
  }

  async exportAll(companyId: string): Promise<Buffer> {
    const headers = [
      'Code',
      'Libellé',
      'Type',
      'Description',
      'Statut',
      'Max tuteurs',
      'Max élèves',
      'Max VSC',
      'Max élèves par tuteur',
      'Options',
    ];
    const items = await this.repository.find({
      where: { companyId },
      order: { label: 'ASC' },
    });
    const formatOptions = (a: Activity): string => {
      const parts: string[] = [];
      if (a.canHasCr) parts.push('Compte rendu');
      if (a.bot) parts.push('Bot');
      if (a.withLink) parts.push('Lien');
      if (a.chat) parts.push('Chat');
      return parts.join(', ');
    };
    const maxCell = (n: number | null | undefined) => (n != null ? String(n) : '');
    const rows = items.map((a) => [
      a.code ?? '',
      a.label ?? '',
      a.activityTypeName ?? '',
      a.description ?? '',
      a.status ?? '',
      maxCell(a.maxTutors),
      maxCell(a.maxStudents),
      maxCell(a.maxVolunteers),
      maxCell(a.maxStudentsPerTutor),
      formatOptions(a),
    ]);
    return buildXlsxBuffer({ sheetName: 'Activités', headerRow: headers, dataRows: rows });
  }
}
