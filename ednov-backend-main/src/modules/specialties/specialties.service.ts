import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Specialty } from './entities/specialty.entity';
import { EstablishmentSpecialty } from './entities/establishment-specialty.entity';
import { SpecialtyLevel } from './entities/specialty-level.entity';
import { Level } from '../academic/entities/level.entity';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import type { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class SpecialtiesService {
  constructor(
    @InjectRepository(Specialty)
    private readonly specialtyRepository: Repository<Specialty>,
    @InjectRepository(EstablishmentSpecialty)
    private readonly establishmentSpecialtyRepository: Repository<EstablishmentSpecialty>,
    @InjectRepository(SpecialtyLevel)
    private readonly specialtyLevelRepository: Repository<SpecialtyLevel>,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  async findAll(
    activeOnly?: boolean,
    companyId?: string,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Specialty>> {
    const qb = this.specialtyRepository
      .createQueryBuilder('specialty')
      .leftJoinAndSelect('specialty.levelLinks', 'sl')
      .leftJoinAndSelect('sl.level', 'l')
      .orderBy('specialty.sortOrder', 'ASC')
      .addOrderBy('specialty.label', 'ASC');
    if (activeOnly === true) {
      qb.andWhere('specialty.isActive = true');
    }

    // Note: specialties est une table globale sans company_id,
    // donc pas de visibilityScope appliqué ici
    
    const data = await qb.getMany();
    const total = data.length;

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((s) => s.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'specialty.id',
              scope,
              'specialties',
              scopeUser || { userId: '', companyId: companyId || '' },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((s) => {
        (s as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(s.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, 1, data.length);
  }

  async findOne(id: string): Promise<Specialty> {
    const row = await this.specialtyRepository.findOne({
      where: { id },
      relations: ['levelLinks', 'levelLinks.level'],
    });
    if (!row) throw new NotFoundException(`Specialty ${id} not found`);
    return row;
  }

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, index) => this.specialtyRepository.update(id, { sortOrder: index })),
    );
  }

  async create(dto: CreateSpecialtyDto): Promise<Specialty> {
    const existing = await this.specialtyRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Specialty code "${dto.code}" already exists`);
    const maxResult = await this.specialtyRepository
      .createQueryBuilder('s')
      .select('MAX(s.sortOrder)', 'max')
      .getRawOne<{ max: number | null }>();
    const nextOrder = (maxResult?.max ?? -1) + 1;
    const row = this.specialtyRepository.create({
      code: dto.code.trim(),
      label: dto.label.trim(),
      sortOrder: nextOrder,
      isActive: dto.isActive !== false,
    });

    const saved = await this.specialtyRepository.save(row);
    if (dto.levelIds !== undefined) {
      await this.replaceLevels(saved.id, dto.levelIds as string[]);
    }
    return this.findOne(saved.id);

  }

  async update(
    id: string,
    dto: UpdateSpecialtyDto,
    writeScope?: VisibilityScope | null,
  ): Promise<Specialty> {
    // Note: specialties est une table globale sans company_id,
    // donc pas de vérification writeScope applicable ici
    const row = await this.findOne(id);
    if (dto.code !== undefined && dto.code !== row.code) {
      const existing = await this.specialtyRepository.findOne({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Specialty code "${dto.code}" already exists`);
      row.code = dto.code.trim();
    }
    if (dto.label !== undefined) row.label = dto.label.trim();
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    await this.specialtyRepository.save(row);
    if (dto.levelIds !== undefined) {
      await this.replaceLevels(id, dto.levelIds);
    }
    return this.findOne(id);
  }

  async remove(
    id: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Note: specialties est une table globale sans company_id,
    // donc pas de vérification writeScope applicable ici
    const row = await this.findOne(id);
    await this.establishmentSpecialtyRepository.delete({ specialtyId: row.id });
    await this.specialtyLevelRepository.delete({ specialtyId: row.id });
    await this.specialtyRepository.remove(row);
  }

  async findHighSchoolLevels(companyId: string): Promise<Level[]> {
    return this.levelRepository.find({
      where: { companyId, educationCycle: 'high', status: 'active' },
      order: { orderIndex: 'ASC', label: 'ASC' },
    });
  }

  private async replaceLevels(specialtyId: string, levelIds: string[]): Promise<void> {
    await this.specialtyLevelRepository.delete({ specialtyId });
    if (levelIds.length === 0) return;
    const links = levelIds.map((levelId) =>
      this.specialtyLevelRepository.create({ specialtyId, levelId }),
    );
    await this.specialtyLevelRepository.save(links);
  }

  /** Replace establishment_specialties rows; specialty IDs must exist and be active. */
  async replaceEstablishmentOffered(
    establishmentId: string,
    establishmentType: string | null | undefined,
    specialtyIds: string[],
  ): Promise<void> {
    const t = (establishmentType ?? '').toLowerCase();
    if (t !== 'lycee') {
      if (specialtyIds.length > 0) {
        throw new BadRequestException('Only lycée establishments can offer specialties');
      }
      await this.establishmentSpecialtyRepository.delete({ establishmentId });
      return;
    }
    if (!specialtyIds.length) {
      await this.establishmentSpecialtyRepository.delete({ establishmentId });
      return;
    }
    const specialties = await this.specialtyRepository.find({
      where: { id: In(specialtyIds), isActive: true },
    });
    if (specialties.length !== specialtyIds.length) {
      throw new BadRequestException('One or more specialty IDs are invalid or inactive');
    }
    await this.establishmentSpecialtyRepository.delete({ establishmentId });
    const links = specialtyIds.map((specialtyId) =>
      this.establishmentSpecialtyRepository.create({ establishmentId, specialtyId }),
    );
    await this.establishmentSpecialtyRepository.save(links);
  }
}
