import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityType } from './entities/activity-type.entity';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';
import { AuditLogService } from '../audit/audit.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';
import { buildXlsxBuffer } from '../../common/utils/excel-export.util';

@Injectable()
export class ActivityTypeService {
  constructor(
    @InjectRepository(ActivityType)
    private readonly repository: Repository<ActivityType>,
    private readonly auditLogService: AuditLogService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  async create(
    companyId: string,
    dto: CreateActivityTypeDto,
    actorId?: string,
  ): Promise<ActivityType> {
    const existing = await this.repository.findOne({
      where: { companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Activity type with code "${dto.code}" already exists for this company`,
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
      entity: 'activity_types',
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
  ): Promise<PaginatedResponse<ActivityType>> {
    const { page = 1, pageSize = 20, statuses, search } = query;
    const statusList = Array.isArray(statuses)
      ? statuses
      : typeof statuses === 'string' && statuses
        ? [statuses]
        : [];
    const { skip, take } = getSkipTake(page, pageSize);
    
    const qb = this.repository
      .createQueryBuilder('activityType')
      .where('activityType.companyId = :companyId', { companyId })
      .orderBy('activityType.label', 'ASC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'activityTypes',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (statusList.length > 0) {
      qb.andWhere('activityType.status IN (:...statusList)', { statusList });
    }

    if (search && search.trim().length > 0) {
      qb.andWhere(
        '(LOWER(activityType.label) LIKE LOWER(:search) OR LOWER(activityType.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    qb.skip(skip).take(take);
    
    const [data, total] = await qb.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((at) => at.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'activityType.id',
              scope,
              'activityTypes',
              scopeUser || { userId: '', companyId },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((at) => {
        (at as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(at.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOne(id: string, companyId: string): Promise<ActivityType> {
    const entity = await this.repository.findOne({
      where: { id, companyId },
    });
    if (!entity) {
      throw new NotFoundException(`Activity type ${id} not found`);
    }
    return entity;
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateActivityTypeDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<ActivityType> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.repository
        .createQueryBuilder('activityType')
        .where('activityType.id = :id', { id })
        .andWhere('activityType.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'activityTypes',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this activity type');
      }
    }

    const entity = await this.findOne(id, companyId);
    if (dto.code !== undefined && dto.code !== entity.code) {
      const existing = await this.repository.findOne({
        where: { companyId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Activity type with code "${dto.code}" already exists for this company`,
        );
      }
    }
    const oldValue = { ...entity } as unknown as Record<string, unknown>;
    Object.assign(entity, dto);
    const saved = await this.repository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'activity_types',
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
        .createQueryBuilder('activityType')
        .where('activityType.id = :id', { id })
        .andWhere('activityType.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'activityTypes',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this activity type');
      }
    }

    await this.findOne(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'activity_types',
      entityId: id,
      action: 'DELETE',
      oldValue: { id } as Record<string, unknown>,
    });
    await this.repository.softDelete(id);
  }

  async exportAll(companyId: string): Promise<Buffer> {
    const headers = ['Code', 'Libellé', 'Description', 'Statut'];
    const items = await this.repository.find({
      where: { companyId },
      order: { label: 'ASC' },
    });
    const rows = items.map((at) => [
      at.code ?? '',
      at.label ?? '',
      at.description ?? '',
      at.status ?? '',
    ]);
    return buildXlsxBuffer({ sheetName: "Types d'activité", headerRow: headers, dataRows: rows });
  }
}
