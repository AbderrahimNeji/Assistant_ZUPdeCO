import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import { Program } from './entities/program.entity';
import { Level } from './entities/level.entity';
import { Subject } from './entities/subject.entity';
import { SchoolYear } from './entities/school-year.entity';
import { SchoolYearQuarter } from './entities/school-year-quarter.entity';
import { Holiday } from './entities/holiday.entity';
import { VacationZone } from './entities/vacation-zone.entity';
import { SchoolClass } from './entities/school-class.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { AuditLogService } from '../audit/audit.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateSchoolClassDto } from './dto/create-school-class.dto';
import { UpdateSchoolClassDto } from './dto/update-school-class.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';
import { parseLocalDate, parseLocalDateEndOfDay } from '../../common/utils/date-parser.utils';
import { formatEducationCycleForExport, formatExportDate } from '../../common/utils/format.utils';
import { buildXlsxBuffer } from '../../common/utils/excel-export.util';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(SchoolYearQuarter)
    private readonly schoolYearQuarterRepository: Repository<SchoolYearQuarter>,
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    @InjectRepository(VacationZone)
    private readonly vacationZoneRepository: Repository<VacationZone>,
    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    private readonly auditLogService: AuditLogService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  private async assertVacationZoneBelongsToCompany(
    companyId: string,
    vacationZoneId: string | null | undefined,
  ): Promise<void> {
    if (vacationZoneId == null || vacationZoneId === '') return;
    const zone = await this.vacationZoneRepository.findOne({
      where: { id: vacationZoneId, companyId },
    });
    if (!zone) {
      throw new BadRequestException('Vacation zone not found for this company');
    }
  }

  // --- Programs ---
  async createProgram(companyId: string, dto: CreateProgramDto, actorId?: string): Promise<Program> {
    const existing = await this.programRepository.findOne({ where: { companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Program code "${dto.code}" already exists`);
    const entity = this.programRepository.create({
      ...dto,
      companyId,
      startDate: dto.startDate ? parseLocalDate(dto.startDate) : null,
      endDate: dto.endDate ? parseLocalDate(dto.endDate) : null,
    });
    const saved = await this.programRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'programs',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllPrograms(
    companyId: string,
    query: any,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Program>> {
    const { page = 1, pageSize = 20, statuses, cycles, periodes, isActive, search } = query;
    const { skip, take } = getSkipTake(page, pageSize);
    
    const queryBuilder = this.programRepository
      .createQueryBuilder('program')
      .where('program.companyId = :companyId', { companyId })
      .orderBy('program.createdAt', 'DESC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        queryBuilder,
        visibilityScope,
        'programs',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere('program.status IN (:...statuses)', { statuses });
    }

    if (cycles && cycles.length > 0) {
      queryBuilder.andWhere('program.cycle IN (:...cycles)', { cycles });
    }

    if (periodes && periodes.length > 0) {
      queryBuilder.andWhere('program.periode IN (:...periodes)', { periodes });
    }

    if (isActive !== undefined && isActive !== null) {
      queryBuilder.andWhere('program.isActive = :isActive', { isActive });
    }

    if (search && search.trim().length > 0) {
      queryBuilder.andWhere(
        '(LOWER(program.name) LIKE LOWER(:search) OR LOWER(program.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    queryBuilder.skip(skip).take(take);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((p) => p.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'program.id',
              scope,
              'programs',
              scopeUser || { userId: '', companyId },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((p) => {
        (p as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(p.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOneProgram(id: string, companyId: string): Promise<Program> {
    const program = await this.programRepository.findOne({ where: { id, companyId } });
    if (!program) throw new NotFoundException(`Program ${id} not found`);
    return program;
  }

  async updateProgram(
    id: string,
    companyId: string,
    dto: UpdateProgramDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<Program> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.programRepository
        .createQueryBuilder('program')
        .where('program.id = :id', { id })
        .andWhere('program.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'programs',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this program');
      }
    }

    const program = await this.findOneProgram(id, companyId);
    const oldValue = { ...program } as unknown as Record<string, unknown>;
    Object.assign(program, {
      ...dto,
      startDate: dto.startDate !== undefined ? (dto.startDate ? parseLocalDate(dto.startDate) : null) : program.startDate,
      endDate: dto.endDate !== undefined ? (dto.endDate ? parseLocalDate(dto.endDate) : null) : program.endDate,
    });
    const saved = await this.programRepository.save(program);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'programs',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeProgram(
    id: string,
    companyId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérifier l'accès avant suppression
    if (actorId && writeScope !== undefined) {
      const qb = this.programRepository
        .createQueryBuilder('program')
        .where('program.id = :id', { id })
        .andWhere('program.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'programs',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this program');
      }
    }

    const program = await this.findOneProgram(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'programs',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: program.id, code: program.code } as Record<string, unknown>,
    });
    await this.programRepository.softDelete(id);
  }

  // --- Levels ---
  async createLevel(companyId: string, dto: CreateLevelDto, actorId?: string): Promise<Level> {
    const existing = await this.levelRepository.findOne({ where: { companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Level code "${dto.code}" already exists`);
    const entity = this.levelRepository.create({ ...dto, companyId });
    const saved = await this.levelRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'levels',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllLevels(
    companyId: string,
    query: any,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Level>> {
    const { page = 1, pageSize = 20, cycles, statuses, search, minAge, maxAge } = query;
    const { skip, take } = getSkipTake(page, pageSize);
    
    const cyclesArr = cycles
      ? (typeof cycles === 'string' ? [cycles] : (cycles as string[]))
      : undefined;
    const statusesArr = statuses
      ? (typeof statuses === 'string' ? [statuses] : (statuses as string[]))
      : undefined;
    
    const queryBuilder = this.levelRepository
      .createQueryBuilder('level')
      .where('level.companyId = :companyId', { companyId })
      .orderBy('level.orderIndex', 'ASC', 'NULLS LAST')
      .addOrderBy('level.label', 'ASC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        queryBuilder,
        visibilityScope,
        'levels',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (cyclesArr && cyclesArr.length > 0) {
      queryBuilder.andWhere('level.educationCycle IN (:...cycles)', { cycles: cyclesArr });
    }

    if (statusesArr && statusesArr.length > 0) {
      queryBuilder.andWhere('level.status IN (:...statuses)', { statuses: statusesArr });
    }

    if (search && search.trim().length > 0) {
      queryBuilder.andWhere(
        '(LOWER(level.code) LIKE LOWER(:search) OR LOWER(level.label) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    if (minAge !== undefined && minAge !== null) {
      queryBuilder.andWhere('level.minAge >= :minAge', { minAge });
    }

    if (maxAge !== undefined && maxAge !== null) {
      queryBuilder.andWhere('level.maxAge <= :maxAge', { maxAge });
    }

    queryBuilder.skip(skip).take(take);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((l) => l.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'level.id',
              scope,
              'levels',
              scopeUser || { userId: '', companyId },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((l) => {
        (l as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(l.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOneLevel(id: string, companyId: string): Promise<Level> {
    const level = await this.levelRepository.findOne({ where: { id, companyId } });
    if (!level) throw new NotFoundException(`Level ${id} not found`);
    return level;
  }

  async updateLevel(
    id: string,
    companyId: string,
    dto: UpdateLevelDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<Level> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.levelRepository
        .createQueryBuilder('level')
        .where('level.id = :id', { id })
        .andWhere('level.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'levels',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this level');
      }
    }

    const level = await this.findOneLevel(id, companyId);
    const oldValue = { ...level } as unknown as Record<string, unknown>;
    Object.assign(level, dto);
    const saved = await this.levelRepository.save(level);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'levels',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeLevel(
    id: string,
    companyId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérifier l'accès avant suppression
    if (actorId && writeScope !== undefined) {
      const qb = this.levelRepository
        .createQueryBuilder('level')
        .where('level.id = :id', { id })
        .andWhere('level.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'levels',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this level');
      }
    }

    const level = await this.findOneLevel(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'levels',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: level.id, code: level.code } as Record<string, unknown>,
    });
    await this.levelRepository.softDelete(id);
  }

  async reorderLevels(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, index) => this.levelRepository.update(id, { orderIndex: index })),
    );
  }

  // --- Subjects ---
  async createSubject(companyId: string, dto: CreateSubjectDto, actorId?: string): Promise<Subject> {
    const existing = await this.subjectRepository.findOne({ where: { companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Subject code "${dto.code}" already exists`);
    const entity = this.subjectRepository.create({ ...dto, companyId });
    const saved = await this.subjectRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'subjects',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllSubjects(
    companyId: string,
    query: any,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Subject>> {
    const { page = 1, pageSize = 20, statuses, search } = query;
    const { skip, take } = getSkipTake(page, pageSize);
    
    const queryBuilder = this.subjectRepository
      .createQueryBuilder('subject')
      .where('subject.companyId = :companyId', { companyId })
      .orderBy('subject.createdAt', 'DESC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        queryBuilder,
        visibilityScope,
        'subjects',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere('subject.status IN (:...statuses)', { statuses });
    }

    if (search && search.trim().length > 0) {
      queryBuilder.andWhere(
        '(LOWER(subject.name) LIKE LOWER(:search) OR LOWER(subject.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    queryBuilder.skip(skip).take(take);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((s) => s.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'subject.id',
              scope,
              'subjects',
              scopeUser || { userId: '', companyId },
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
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOneSubject(id: string, companyId: string): Promise<Subject> {
    const subject = await this.subjectRepository.findOne({ where: { id, companyId } });
    if (!subject) throw new NotFoundException(`Subject ${id} not found`);
    return subject;
  }

  async updateSubject(
    id: string,
    companyId: string,
    dto: UpdateSubjectDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<Subject> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.subjectRepository
        .createQueryBuilder('subject')
        .where('subject.id = :id', { id })
        .andWhere('subject.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'subjects',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this subject');
      }
    }

    const subject = await this.findOneSubject(id, companyId);
    const oldValue = { ...subject } as unknown as Record<string, unknown>;
    Object.assign(subject, dto);
    const saved = await this.subjectRepository.save(subject);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'subjects',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeSubject(
    id: string,
    companyId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérifier l'accès avant suppression
    if (actorId && writeScope !== undefined) {
      const qb = this.subjectRepository
        .createQueryBuilder('subject')
        .where('subject.id = :id', { id })
        .andWhere('subject.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'subjects',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this subject');
      }
    }

    const subject = await this.findOneSubject(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'subjects',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: subject.id, code: subject.code } as Record<string, unknown>,
    });
    await this.subjectRepository.softDelete(id);
  }

  // --- School years ---
  async createSchoolYear(companyId: string, dto: CreateSchoolYearDto, actorId?: string): Promise<SchoolYear> {
    const existing = await this.schoolYearRepository.findOne({ where: { companyId, code: dto.code } });
    if (existing) throw new ConflictException(`School year code "${dto.code}" already exists`);
    const entity = this.schoolYearRepository.create({
      ...dto,
      companyId,
      startDate: parseLocalDate(dto.startDate),
      endDate: parseLocalDate(dto.endDate),
    });
    const saved = await this.schoolYearRepository.save(entity);
    
    // Auto-créer les 3 trimestres
    await this.createQuartersForSchoolYear(saved);
    
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'school_years',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  /**
   * Crée automatiquement les 3 trimestres pour une année scolaire
   * T1 : 1er octobre → 31 décembre
   * T2 : 1er janvier → 31 mars
   * T3 : 1er avril → 30 juin
   */
  private async createQuartersForSchoolYear(schoolYear: SchoolYear): Promise<void> {
    const startYear = new Date(schoolYear.startDate).getFullYear();

    const quarters = [
      {
        number: 1,
        startDate: new Date(`${startYear}-10-01`),
        endDate: new Date(`${startYear}-12-31`),
      },
      {
        number: 2,
        startDate: new Date(`${startYear + 1}-01-01`),
        endDate: new Date(`${startYear + 1}-03-31`),
      },
      {
        number: 3,
        startDate: new Date(`${startYear + 1}-04-01`),
        endDate: new Date(`${startYear + 1}-06-30`),
      },
    ];

    for (const quarter of quarters) {
      const entity = this.schoolYearQuarterRepository.create({
        schoolYearId: schoolYear.id,
        companyId: schoolYear.companyId,
        number: quarter.number,
        startDate: quarter.startDate,
        endDate: quarter.endDate,
      });

      await this.schoolYearQuarterRepository.save(entity);
    }
  }

  async findAllSchoolYears(
    companyId: string,
    query: any,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<SchoolYear>> {
    const { page = 1, pageSize = 20, statuses, search, isCurrent, periodPhases } = query;
    const statusList = Array.isArray(statuses)
      ? statuses
      : typeof statuses === 'string' && statuses
        ? [statuses]
        : [];
    const periodPhaseList = Array.isArray(periodPhases)
      ? periodPhases
      : typeof periodPhases === 'string' && periodPhases
        ? [periodPhases]
        : [];
    const { skip, take } = getSkipTake(page, pageSize);
    
    const queryBuilder = this.schoolYearRepository
      .createQueryBuilder('schoolYear')
      .where('schoolYear.companyId = :companyId', { companyId })
      .orderBy('schoolYear.startDate', 'DESC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        queryBuilder,
        visibilityScope,
        'schoolYears',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (statusList.length > 0) {
      queryBuilder.andWhere('schoolYear.status IN (:...statusList)', { statusList });
    }

    if (search && search.trim().length > 0) {
      queryBuilder.andWhere(
        '(LOWER(schoolYear.name) LIKE LOWER(:search) OR LOWER(schoolYear.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Type filters (Année en cours / Terminée / À venir) — combined with OR
    const isCur = isCurrent === 'true' || isCurrent === true;
    const hasIsCurrentFilter = isCurrent !== undefined && isCurrent !== null;
    const hasEndedFilter = periodPhaseList.includes('ended');
    const hasUpcomingFilter = periodPhaseList.includes('upcoming');

    if (hasIsCurrentFilter || hasEndedFilter || hasUpcomingFilter) {
      const now = new Date();
      queryBuilder.andWhere(
        new Brackets((qb) => {
          let first = true;
          const add = (condition: string, params?: object) => {
            if (first) { qb.where(condition, params); first = false; }
            else { qb.orWhere(condition, params); }
          };
          if (hasIsCurrentFilter) add('schoolYear.isCurrent = :isCur', { isCur });
          if (hasEndedFilter) add('schoolYear.endDate < :nowEnded', { nowEnded: now });
          if (hasUpcomingFilter) add('schoolYear.startDate > :nowUpcoming', { nowUpcoming: now });
        }),
      );
    }

    queryBuilder.skip(skip).take(take);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((sy) => sy.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'schoolYear.id',
              scope,
              'schoolYears',
              scopeUser || { userId: '', companyId },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((sy) => {
        (sy as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(sy.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOneSchoolYear(id: string, companyId: string): Promise<SchoolYear> {
    const sy = await this.schoolYearRepository.findOne({ where: { id, companyId } });
    if (!sy) throw new NotFoundException(`School year ${id} not found`);
    return sy;
  }

  async updateSchoolYear(
    id: string,
    companyId: string,
    dto: UpdateSchoolYearDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<SchoolYear> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.schoolYearRepository
        .createQueryBuilder('schoolYear')
        .where('schoolYear.id = :id', { id })
        .andWhere('schoolYear.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'schoolYears',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this school year');
      }
    }

    const sy = await this.findOneSchoolYear(id, companyId);
    const oldValue = { ...sy } as unknown as Record<string, unknown>;
    Object.assign(sy, {
      ...dto,
      startDate: dto.startDate ? parseLocalDate(dto.startDate) : sy.startDate,
      endDate: dto.endDate ? parseLocalDate(dto.endDate) : sy.endDate,
    });
    const saved = await this.schoolYearRepository.save(sy);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'school_years',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeSchoolYear(
    id: string,
    companyId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérifier l'accès avant suppression
    if (actorId && writeScope !== undefined) {
      const qb = this.schoolYearRepository
        .createQueryBuilder('schoolYear')
        .where('schoolYear.id = :id', { id })
        .andWhere('schoolYear.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'schoolYears',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this school year');
      }
    }

    const sy = await this.findOneSchoolYear(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'school_years',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: sy.id, code: sy.code } as Record<string, unknown>,
    });
    await this.schoolYearRepository.delete(id);
  }

  // --- School classes ---
  private async assertSchoolClassRefs(
    companyId: string,
    establishmentId: string,
    schoolYearId: string,
    levelId: string,
  ): Promise<void> {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId, companyId },
    });
    if (!establishment) {
      throw new BadRequestException('Establishment not found for this company');
    }
    const schoolYear = await this.schoolYearRepository.findOne({ where: { id: schoolYearId, companyId } });
    if (!schoolYear) {
      throw new BadRequestException('School year not found for this company');
    }
    const level = await this.levelRepository.findOne({ where: { id: levelId, companyId } });
    if (!level) {
      throw new BadRequestException('Level not found for this company');
    }
  }

  async createSchoolClass(
    companyId: string,
    dto: CreateSchoolClassDto,
    actorId?: string,
  ): Promise<SchoolClass> {
    await this.assertSchoolClassRefs(
      companyId,
      dto.establishmentId,
      dto.schoolYearId,
      dto.levelId,
    );
    const entity = this.schoolClassRepository.create({
      companyId,
      establishmentId: dto.establishmentId,
      schoolYearId: dto.schoolYearId,
      levelId: dto.levelId,
      name: dto.name.trim(),
      studentCount: dto.studentCount ?? null,
    });
    try {
      const saved = await this.schoolClassRepository.save(entity);
      await this.auditLogService.log({
        companyId,
        userId: actorId,
        entity: 'school_classes',
        entityId: saved.id,
        action: 'CREATE',
        newValue: dto as unknown as Record<string, unknown>,
      });
      return this.findOneSchoolClass(saved.id, companyId);
    } catch (e) {
      if (e instanceof QueryFailedError && (e as { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new ConflictException(
          'A class with this name already exists for this establishment and school year',
        );
      }
      throw e;
    }
  }

  async findAllSchoolClasses(companyId: string, query: Record<string, unknown>): Promise<PaginatedResponse<SchoolClass>> {
    const { page = 1, pageSize = 20, establishmentId, schoolYearId, levelId, search } = query as {
      page?: number;
      pageSize?: number;
      establishmentId?: string;
      schoolYearId?: string;
      levelId?: string;
      search?: string;
    };
    const { skip, take } = getSkipTake(page, pageSize);

    const queryBuilder = this.schoolClassRepository
      .createQueryBuilder('sc')
      .leftJoinAndSelect('sc.establishment', 'est')
      .leftJoinAndSelect('sc.schoolYear', 'sy')
      .leftJoinAndSelect('sc.level', 'lvl')
      .where('sc.companyId = :companyId', { companyId })
      .orderBy('sc.name', 'ASC')
      .addOrderBy('sc.createdAt', 'DESC');

    if (establishmentId) {
      queryBuilder.andWhere('sc.establishmentId = :establishmentId', { establishmentId });
    }
    if (schoolYearId) {
      queryBuilder.andWhere('sc.schoolYearId = :schoolYearId', { schoolYearId });
    }
    if (levelId) {
      queryBuilder.andWhere('sc.levelId = :levelId', { levelId });
    }
    if (search && String(search).trim().length > 0) {
      queryBuilder.andWhere('LOWER(sc.name) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    queryBuilder.skip(skip).take(take);

    const [data, total] = await queryBuilder.getManyAndCount();
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOneSchoolClass(id: string, companyId: string): Promise<SchoolClass> {
    const row = await this.schoolClassRepository.findOne({
      where: { id, companyId },
      relations: ['establishment', 'schoolYear', 'level'],
    });
    if (!row) throw new NotFoundException(`School class ${id} not found`);
    return row;
  }

  async updateSchoolClass(
    id: string,
    companyId: string,
    dto: UpdateSchoolClassDto,
    actorId?: string,
  ): Promise<SchoolClass> {
    const row = await this.findOneSchoolClass(id, companyId);
    const establishmentId = dto.establishmentId ?? row.establishmentId;
    const schoolYearId = dto.schoolYearId ?? row.schoolYearId;
    const levelId = dto.levelId ?? row.levelId;
    if (dto.establishmentId !== undefined || dto.schoolYearId !== undefined || dto.levelId !== undefined) {
      await this.assertSchoolClassRefs(companyId, establishmentId, schoolYearId, levelId);
    }
    const oldValue = { ...row } as unknown as Record<string, unknown>;
    Object.assign(row, {
      ...dto,
      name: dto.name !== undefined ? dto.name.trim() : row.name,
      establishmentId,
      schoolYearId,
      levelId,
    });
    try {
      await this.schoolClassRepository.save(row);
      await this.auditLogService.log({
        companyId,
        userId: actorId,
        entity: 'school_classes',
        entityId: id,
        action: 'UPDATE',
        oldValue,
        newValue: dto as unknown as Record<string, unknown>,
      });
      return this.findOneSchoolClass(id, companyId);
    } catch (e) {
      if (e instanceof QueryFailedError && (e as { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new ConflictException(
          'A class with this name already exists for this establishment and school year',
        );
      }
      throw e;
    }
  }

  async removeSchoolClass(id: string, companyId: string, actorId?: string): Promise<void> {
    const row = await this.findOneSchoolClass(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'school_classes',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: row.id, name: row.name } as Record<string, unknown>,
    });
    await this.schoolClassRepository.softDelete(id);
  }

  // --- Vacation zones ---
  async findAllVacationZones(companyId: string): Promise<VacationZone[]> {
    return this.vacationZoneRepository.find({
      where: { companyId },
      order: { code: 'ASC' },
    });
  }

  // --- Holidays ---
  async createHoliday(companyId: string, dto: CreateHolidayDto, actorId?: string): Promise<Holiday> {
    await this.assertVacationZoneBelongsToCompany(companyId, dto.vacationZoneId);
    const entity = this.holidayRepository.create({
      ...dto,
      companyId,
      startDate: parseLocalDate(dto.startDate),
      endDate: parseLocalDate(dto.endDate),
    });
    const saved = await this.holidayRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'holidays',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllHolidays(
    companyId: string,
    query: any,
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Holiday>> {
    const { page = 1, pageSize = 20, types, schoolYearId, dateFrom, dateTo, search } = query;
    const typeList = Array.isArray(types)
      ? types
      : typeof types === 'string' && types
        ? [types]
        : [];
    const { skip, take } = getSkipTake(page, pageSize);
    
    const queryBuilder = this.holidayRepository
      .createQueryBuilder('holiday')
      .leftJoinAndSelect('holiday.vacationZone', 'vacationZone')
      .where('holiday.companyId = :companyId', { companyId })
      .orderBy('holiday.startDate', 'DESC');

    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        queryBuilder,
        visibilityScope,
        'holidays',
        { userId: scopeUser.userId, companyId: scopeUser.companyId },
      );
    }

    if (typeList.length > 0) {
      queryBuilder.andWhere('holiday.type IN (:...typeList)', { typeList });
    }

    if (schoolYearId) {
      queryBuilder.andWhere('holiday.schoolYearId = :schoolYearId', { schoolYearId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('holiday.startDate >= :dateFrom', { dateFrom: parseLocalDate(dateFrom) });
    }

    if (dateTo) {
      queryBuilder.andWhere('holiday.endDate <= :dateTo', { dateTo: parseLocalDateEndOfDay(dateTo) });
    }

    if (search && search.trim().length > 0) {
      queryBuilder.andWhere(
        '(LOWER(holiday.name) LIKE LOWER(:search) OR LOWER(holiday.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    queryBuilder.skip(skip).take(take);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0) {
      const entityIds = data.map((h) => h.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'holiday.id',
              scope,
              'holidays',
              scopeUser || { userId: '', companyId },
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((h) => {
        (h as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(h.id)]),
        );
      });
    }
    
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOneHoliday(id: string, companyId: string): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOne({
      where: { id, companyId },
      relations: ['establishment', 'vacationZone'],
    });
    if (!holiday) throw new NotFoundException(`Holiday ${id} not found`);
    return holiday;
  }

  async updateHoliday(
    id: string,
    companyId: string,
    dto: UpdateHolidayDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<Holiday> {
    // Vérifier l'accès avant mutation
    if (actorId && writeScope !== undefined) {
      const qb = this.holidayRepository
        .createQueryBuilder('holiday')
        .where('holiday.id = :id', { id })
        .andWhere('holiday.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'holidays',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this holiday');
      }
    }

    const holiday = await this.findOneHoliday(id, companyId);
    if (dto.vacationZoneId !== undefined) {
      await this.assertVacationZoneBelongsToCompany(companyId, dto.vacationZoneId ?? undefined);
    }
    const oldValue = { ...holiday } as unknown as Record<string, unknown>;
    Object.assign(holiday, {
      ...dto,
      startDate: dto.startDate ? parseLocalDate(dto.startDate) : holiday.startDate,
      endDate: dto.endDate ? parseLocalDate(dto.endDate) : holiday.endDate,
      ...(dto.vacationZoneId !== undefined ? { vacationZoneId: dto.vacationZoneId } : {}),
    });
    const saved = await this.holidayRepository.save(holiday);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'holidays',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeHoliday(
    id: string,
    companyId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérifier l'accès avant suppression
    if (actorId && writeScope !== undefined) {
      const qb = this.holidayRepository
        .createQueryBuilder('holiday')
        .where('holiday.id = :id', { id })
        .andWhere('holiday.companyId = :companyId', { companyId });

      if (writeScope !== null) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          writeScope,
          'holidays',
          { userId: actorId, companyId },
        );
      }

      const accessible = await qb.getOne();
      if (!accessible) {
        throw new ForbiddenException('You do not have access to this holiday');
      }
    }

    const holiday = await this.findOneHoliday(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'holidays',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: holiday.id, name: holiday.name } as Record<string, unknown>,
    });
    await this.holidayRepository.softDelete(id);
  }

  // --- Exports ---

  async exportSubjects(companyId: string): Promise<Buffer> {
    const headers = ['Code', 'Libellé', 'Cycle éducatif', 'Type', 'Statut'];
    const subjects = await this.subjectRepository.find({
      where: { companyId },
      order: { label: 'ASC' },
    });
    const rows = subjects.map((s) => [
      s.code ?? '',
      s.label ?? '',
      formatEducationCycleForExport(s.educationCycle),
      s.isCore ? 'Matière principale' : '',
      s.status ?? '',
    ]);
    return buildXlsxBuffer({ sheetName: 'Matières', headerRow: headers, dataRows: rows });
  }

  async exportLevels(companyId: string): Promise<Buffer> {
    const headers = ['Code', 'Libellé', 'Cycle éducatif', "Tranche d'âge", 'Statut'];
    const levels = await this.levelRepository.find({
      where: { companyId },
      order: { label: 'ASC' },
    });
    const rows = levels.map((l) => {
      const ageRange =
        l.minAge != null && l.maxAge != null
          ? `${l.minAge}-${l.maxAge} ans`
          : l.minAge != null
            ? `${l.minAge}+ ans`
            : l.maxAge != null
              ? `jusqu'à ${l.maxAge} ans`
              : '';
      return [
        l.code ?? '',
        l.label ?? '',
        formatEducationCycleForExport(l.educationCycle),
        ageRange,
        l.status ?? '',
      ];
    });
    return buildXlsxBuffer({ sheetName: 'Niveaux', headerRow: headers, dataRows: rows });
  }

  async exportPrograms(companyId: string): Promise<Buffer> {
    const headers = ['Code', 'Nom', 'Date début', 'Date fin', 'Statut'];
    const programs = await this.programRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    const rows = programs.map((p) => [
      p.code ?? '',
      p.name ?? '',
      formatExportDate(p.startDate ?? null),
      formatExportDate(p.endDate ?? null),
      p.status ?? '',
    ]);
    return buildXlsxBuffer({ sheetName: 'Programmes', headerRow: headers, dataRows: rows });
  }

  async exportSchoolYears(companyId: string): Promise<Buffer> {
    const headers = ['Code', 'Date début', 'Date fin', 'Année en cours', 'Statut'];
    const schoolYears = await this.schoolYearRepository.find({
      where: { companyId },
      order: { startDate: 'DESC' },
    });
    const rows = schoolYears.map((sy) => [
      sy.code ?? '',
      formatExportDate(sy.startDate ?? null),
      formatExportDate(sy.endDate ?? null),
      sy.isCurrent ? 'Oui' : 'Non',
      sy.status ?? '',
    ]);
    return buildXlsxBuffer({ sheetName: 'Années scolaires', headerRow: headers, dataRows: rows });
  }

  async exportHolidays(companyId: string): Promise<Buffer> {
    const headers = ['Nom', 'Type', 'Zone', 'Date de début', 'Date de fin', 'Options', 'Description'];
    const holidays = await this.holidayRepository.find({
      where: { companyId },
      relations: ['vacationZone'],
      order: { startDate: 'DESC' },
    });
    const formatHolidayOptions = (h: (typeof holidays)[0]): string => {
      const parts: string[] = [];
      parts.push(h.isRecurringYearly ? 'Récurrent chaque année' : 'Non récurrent');
      const est = h.establishmentName?.trim();
      if (est) parts.push(`Établissement : ${est}`);
      return parts.join('; ');
    };
    const rows = holidays.map((h) => [
      h.name ?? '',
      h.type ?? '',
      h.vacationZone?.code ?? '',
      formatExportDate(h.startDate ?? null),
      formatExportDate(h.endDate ?? null),
      formatHolidayOptions(h),
      h.description ?? '',
    ]);
    return buildXlsxBuffer({ sheetName: 'Vacances', headerRow: headers, dataRows: rows });
  }
}
