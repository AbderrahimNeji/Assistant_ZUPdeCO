import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { AssignedPostItTemplate } from './entities/assigned-post-it-template.entity';
import { PostIt } from './entities/post-it.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { SchoolYear } from '../academic/entities/school-year.entity';
import { SchoolYearQuarter } from '../academic/entities/school-year-quarter.entity';
import { CreateAssignedPostItTemplateDto } from './dto/create-assigned-post-it-template.dto';
import { UpdateAssignedPostItTemplateDto, BulkUpdateAssignedPostItTemplateDto } from './dto/update-assigned-post-it-template.dto';
import { ListAssignedPostItTemplatesQueryDto } from './dto/list-assigned-post-it-templates-query.dto';
import {
  AssignedPostItTemplateListResponseDto,
  AssignedPostItTemplateResponseDto,
  toAssignedPostItTemplateResponseDto,
} from './dto/assigned-post-it-template-response.dto';
import { CreateAssignedPostItDto } from './dto/create-assigned-post-it.dto';
import { AssignedPostItRecurrence } from './entities/assigned-post-it-template.entity';
import { AssignedPostItResponseDto, toAssignedPostItResponseDto } from './dto/assigned-post-it-response.dto';
import { BulkAssignedPostItDto } from './dto/bulk-assigned-post-it.dto';
import { parseLocalDate, parseLocalDateEndOfDay } from '../../common/utils/date-parser.utils';
import { isAdvancedScheduleDue, buildAdvancedPeriodKey, calculateDeadlineFromSchedule } from './advanced-schedule.helpers';

@Injectable()
export class AssignedPostItTemplatesService {
  private readonly logger = new Logger(AssignedPostItTemplatesService.name);

  constructor(
    @InjectRepository(AssignedPostItTemplate)
    private readonly templateRepository: Repository<AssignedPostItTemplate>,
    @InjectRepository(PostIt)
    private readonly postItRepository: Repository<PostIt>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(SchoolYearQuarter)
    private readonly schoolYearQuarterRepository: Repository<SchoolYearQuarter>,
  ) {}

  async create(
    dto: CreateAssignedPostItTemplateDto,
    adminUserId: string,
    companyId: string,
  ): Promise<AssignedPostItTemplateResponseDto> {
    if (!dto.targetRoleCode && !dto.targetUserId) {
      throw new BadRequestException('Either targetRoleCode or targetUserId must be provided');
    }

    if (dto.recurrenceType === 'specific_date' && !dto.specificDateFrom) {
      throw new BadRequestException('specificDateFrom is required when recurrenceType is specific_date');
    }

    const template = this.templateRepository.create({
      companyId,
      createdById: adminUserId,
      title: dto.title,
      thematic: dto.thematic,
      content: dto.content,
      color: dto.color ?? 'jaune',
      isPriority: dto.isPriority ?? false,
      targetRoleCode: dto.targetRoleCode ?? null,
      targetUserId: dto.targetUserId ?? null,
      recurrenceType: dto.recurrenceType,
      specificDateFrom: dto.specificDateFrom ? parseLocalDate(dto.specificDateFrom) : null,
      specificDateTo: dto.specificDateTo ? parseLocalDateEndOfDay(dto.specificDateTo) : null,
      isActive: true,
      lastProvisionedAt: null,
    });

    const saved = await this.templateRepository.save(template);
    return toAssignedPostItTemplateResponseDto(saved);
  }

  async findAll(
    companyId: string,
    query: ListAssignedPostItTemplatesQueryDto,
  ): Promise<AssignedPostItTemplateListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.templateRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.deletedAt IS NULL');

    if (query.recurrenceType) {
      qb.andWhere('t.recurrenceType = :recurrenceType', { recurrenceType: query.recurrenceType });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('t.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [templates, total] = await qb.getManyAndCount();

    return {
      data: templates.map(toAssignedPostItTemplateResponseDto),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, companyId: string): Promise<AssignedPostItTemplateResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Assigned post-it template ${id} not found`);
    }

    return toAssignedPostItTemplateResponseDto(template);
  }

  async update(
    id: string,
    dto: UpdateAssignedPostItTemplateDto,
    companyId: string,
  ): Promise<AssignedPostItTemplateResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Assigned post-it template ${id} not found`);
    }

    if (dto.title !== undefined) template.title = dto.title;
    if (dto.thematic !== undefined) template.thematic = dto.thematic;
    if (dto.content !== undefined) template.content = dto.content;
    if (dto.color !== undefined) template.color = dto.color;
    if (dto.isPriority !== undefined) template.isPriority = dto.isPriority;
    if (dto.targetRoleCode !== undefined) template.targetRoleCode = dto.targetRoleCode;
    if (dto.targetUserId !== undefined) template.targetUserId = dto.targetUserId;
    if (dto.recurrenceType !== undefined) template.recurrenceType = dto.recurrenceType;
    if (dto.specificDateFrom !== undefined) {
      template.specificDateFrom = dto.specificDateFrom ? parseLocalDate(dto.specificDateFrom) : null;
    }
    if (dto.specificDateTo !== undefined) {
      template.specificDateTo = dto.specificDateTo ? parseLocalDateEndOfDay(dto.specificDateTo) : null;
    }
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    const saved = await this.templateRepository.save(template);
    return toAssignedPostItTemplateResponseDto(saved);
  }

  async bulkUpdate(
    dto: BulkUpdateAssignedPostItTemplateDto,
    companyId: string,
  ): Promise<{ updated: number; notFound: string[] }> {
    const { ids, data } = dto;

    const existing = await this.templateRepository
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', { ids })
      .andWhere('t.companyId = :companyId', { companyId })
      .andWhere('t.deletedAt IS NULL')
      .getMany();

    const foundIds = new Set(existing.map((t) => t.id));
    const notFound = ids.filter((id) => !foundIds.has(id));

    if (!existing.length) {
      return { updated: 0, notFound };
    }

    for (const template of existing) {
      if (data.title !== undefined) template.title = data.title;
      if (data.thematic !== undefined) template.thematic = data.thematic;
      if (data.content !== undefined) template.content = data.content;
      if (data.color !== undefined) template.color = data.color;
      if (data.isPriority !== undefined) template.isPriority = data.isPriority;
      if (data.targetRoleCode !== undefined) template.targetRoleCode = data.targetRoleCode;
      if (data.targetUserId !== undefined) template.targetUserId = data.targetUserId;
      if (data.recurrenceType !== undefined) template.recurrenceType = data.recurrenceType;
      if (data.specificDateFrom !== undefined) {
        template.specificDateFrom = data.specificDateFrom ? parseLocalDate(data.specificDateFrom) : null;
      }
      if (data.specificDateTo !== undefined) {
        template.specificDateTo = data.specificDateTo ? parseLocalDateEndOfDay(data.specificDateTo) : null;
      }
      if (data.isActive !== undefined) template.isActive = data.isActive;
    }

    await this.templateRepository.save(existing);

    // Si isPriority est défini, propager aux instances existantes
    if (data.isPriority !== undefined) {
      for (const template of existing) {
        await this.postItRepository
          .createQueryBuilder()
          .update(PostIt)
          .set({ isPriority: data.isPriority })
          .where('defaultPostItKey LIKE :pattern', { pattern: `assigned_tpl_${template.id}_%` })
          .andWhere('deletedAt IS NULL')
          .execute();
      }
      this.logger.log(`bulkUpdate: propagated isPriority=${data.isPriority} to instances`);
    }

    this.logger.log(`bulkUpdate: updated ${existing.length} templates in company ${companyId}`);
    return { updated: existing.length, notFound };
  }

  async remove(id: string, companyId: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Assigned post-it template ${id} not found`);
    }

    await this.templateRepository.softDelete(id);
  }

  async bulkDelete(ids: string[], companyId: string): Promise<{ deleted: number }> {
    // 1. Vérifier que les templates existent et appartiennent à la company
    const templates = await this.templateRepository
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', { ids })
      .andWhere('t.companyId = :companyId', { companyId })
      .andWhere('t.deletedAt IS NULL')
      .getMany();

    if (templates.length === 0) {
      return { deleted: 0 };
    }

    const validIds = templates.map(t => t.id);

    // 2. Soft-delete les templates
    await this.templateRepository.softDelete(validIds);

    // 3. Soft-delete toutes les instances de post-its créées par ces templates
    // Utilisation du pattern defaultPostItKey: 'assigned_tpl_{templateId}_{periodKey}'
    for (const id of validIds) {
      await this.postItRepository
        .createQueryBuilder()
        .softDelete()
        .where('defaultPostItKey LIKE :pattern', { pattern: `assigned_tpl_${id}_%` })
        .andWhere('deletedAt IS NULL')
        .execute();
    }

    this.logger.log(`Bulk deleted ${validIds.length} templates and their instances for company ${companyId}`);

    return { deleted: validIds.length };
  }

  // ─── Frontend-facing API methods ─────────────────────────────────────────

  async createFrontend(
    dto: CreateAssignedPostItDto,
    adminUserId: string,
    companyId: string,
  ): Promise<AssignedPostItResponseDto> {
    if (dto.recurrence === 'specific_date' && !dto.specificDateFrom) {
      throw new BadRequestException('specificDateFrom is required when recurrence is specific_date');
    }

    // Resolve role code from UUIDs for backward-compat provision logic
    let firstRoleCode: string | null = null;
    if (dto.targetRoleIds?.length) {
      const roles = await this.roleRepository
        .createQueryBuilder('r')
        .where('r.id IN (:...ids)', { ids: dto.targetRoleIds })
        .andWhere('r.companyId = :companyId', { companyId })
        .getMany();
      firstRoleCode = roles.length > 0 ? roles[0].code : null;
    }

    const template = this.templateRepository.create({
      companyId,
      createdById: adminUserId,
      title: dto.title,
      thematic: dto.thematic,
      content: dto.content,
      color: dto.color ?? 'jaune',
      isPriority: dto.isPriority ?? false,
      targetRoleIds: dto.targetRoleIds ?? [],
      targetRoleCode: firstRoleCode,
      targetUserId: null,
      recurrenceType: dto.recurrence ?? null,
      specificDateFrom: dto.specificDateFrom ? parseLocalDate(dto.specificDateFrom) : null,
      specificDateTo: dto.specificDateTo ? parseLocalDateEndOfDay(dto.specificDateTo) : null,
      quarterlyPeriods: dto.quarterlyPeriods ?? [],
      scheduleConfig: dto.scheduleConfig ?? null,
      isActive: true,
      lastProvisionedAt: null,
    });

    const saved = await this.templateRepository.save(template);

    // Non-blocking provision check
    this.provisionIfDue(saved);

    const creator = await this.userRepository.findOne({ where: { id: adminUserId } });
    const createdByName = creator
      ? `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim() || creator.email || 'Unknown'
      : 'Unknown';

    return toAssignedPostItResponseDto(saved, createdByName);
  }

  async findAllFrontend(
    companyId: string,
    filter?: AssignedPostItRecurrence | 'all',
    dateFrom?: string,
    dateTo?: string,
    quarterlyPeriods?: number[],
  ): Promise<AssignedPostItResponseDto[]> {
    const qb = this.templateRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.isActive = true')
      .andWhere('t.deletedAt IS NULL');

    if (filter && filter !== 'all') {
      qb.andWhere('t.recurrenceType = :recurrence', { recurrence: filter });

      if (filter === 'specific_date' && dateFrom && dateTo) {
        qb.andWhere('t.specificDate BETWEEN :dateFrom AND :dateTo', {
          dateFrom: new Date(dateFrom),
          dateTo: new Date(dateTo),
        });
      }

      if (filter === 'quarterly' && quarterlyPeriods?.length) {
        qb.andWhere('t.quarterlyPeriods && :periods', { periods: quarterlyPeriods });
      }
    }

    qb.orderBy('t.createdAt', 'DESC');

    const templates = await qb.getMany();

    return templates.map((t) => toAssignedPostItResponseDto(t));
  }

  async bulkActionFrontend(
    dto: BulkAssignedPostItDto,
    companyId: string,
  ): Promise<{ updated: number; notFound: string[] }> {
    const existing = await this.templateRepository
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', { ids: dto.ids })
      .andWhere('t.companyId = :companyId', { companyId })
      .andWhere('t.deletedAt IS NULL')
      .getMany();

    const foundIds = new Set(existing.map((t) => t.id));
    const notFound = dto.ids.filter((id) => !foundIds.has(id));

    if (!existing.length) return { updated: 0, notFound };

    // Resolve role code from UUID for backward compat
    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, companyId },
    });

    for (const template of existing) {
      template.recurrenceType = dto.recurrence;
      template.targetRoleIds = [dto.roleId];
      if (role) template.targetRoleCode = role.code;
      template.specificDateFrom = dto.specificDateFrom ? parseLocalDate(dto.specificDateFrom) : null;
      template.specificDateTo = dto.specificDateTo ? parseLocalDateEndOfDay(dto.specificDateTo) : null;
      if (dto.quarterlyPeriods !== undefined) template.quarterlyPeriods = dto.quarterlyPeriods;
      if (dto.scheduleConfig !== undefined) template.scheduleConfig = dto.scheduleConfig;
    }

    await this.templateRepository.save(existing);
    
    // Provision templates if due (non-blocking)
    for (const template of existing) {
      this.provisionIfDue(template);
    }
    
    this.logger.log(`bulkActionFrontend: updated ${existing.length} templates`);
    return { updated: existing.length, notFound };
  }

  async updateFrontend(
    id: string,
    dto: Partial<CreateAssignedPostItDto>,
    companyId: string,
  ): Promise<AssignedPostItResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!template) throw new NotFoundException('Template not found');

    if (dto.title !== undefined) template.title = dto.title;
    if (dto.thematic !== undefined) template.thematic = dto.thematic;
    if (dto.content !== undefined) template.content = dto.content;
    if (dto.color !== undefined) template.color = dto.color;
    if (dto.isPriority !== undefined) template.isPriority = dto.isPriority;
    if (dto.recurrence !== undefined) template.recurrenceType = dto.recurrence;
    if (dto.specificDateFrom !== undefined) {
      template.specificDateFrom = dto.specificDateFrom ? parseLocalDate(dto.specificDateFrom) : null;
    }
    if (dto.specificDateTo !== undefined) {
      template.specificDateTo = dto.specificDateTo ? parseLocalDateEndOfDay(dto.specificDateTo) : null;
    }
    if (dto.quarterlyPeriods !== undefined) template.quarterlyPeriods = dto.quarterlyPeriods;
    if (dto.scheduleConfig !== undefined) template.scheduleConfig = dto.scheduleConfig ?? null;

    if (dto.targetRoleIds !== undefined) {
      template.targetRoleIds = dto.targetRoleIds ?? [];
      const roles = dto.targetRoleIds?.length
        ? await this.roleRepository
            .createQueryBuilder('r')
            .where('r.id IN (:...ids)', { ids: dto.targetRoleIds })
            .andWhere('r.companyId = :companyId', { companyId })
            .getMany()
        : [];
      template.targetRoleCode = roles.length > 0 ? roles[0].code : null;
    }

    const saved = await this.templateRepository.save(template);

    // Non-blocking provision check
    this.provisionIfDue(saved);

    return toAssignedPostItResponseDto(saved);
  }

  // ─── Provision methods ────────────────────────────────────────────────────

  /**
   * Non-blocking provision check: if template is due, provision it immediately.
   * Called after create/update to give instant feedback without waiting for cron.
   */
  private provisionIfDue(template: AssignedPostItTemplate): void {
    const now = new Date();
    this.isDue(template, now)
      .then((due) => {
        if (due) return this.provisionTemplate(template);
      })
      .catch((err) =>
        this.logger.error(`provisionIfDue failed for ${template.id}: ${err.message}`)
      );
  }

  /**
   * Provision post-its for ALL target users of a template.
   * Updates lastProvisionedAt on the template after successful provisioning.
   */
  async provisionTemplate(template: AssignedPostItTemplate): Promise<number> {
    const targetUsers = await this.resolveTargetUsers(template);

    if (!targetUsers.length) {
      this.logger.warn(`Template ${template.id}: no target users found (role=${template.targetRoleCode}, userId=${template.targetUserId})`);
      return 0;
    }

    // For quarterly templates with explicit periods, provision once per selected period
    const periodsToProvision: (number | undefined)[] =
      template.recurrenceType === 'quarterly' && template.quarterlyPeriods?.length
        ? template.quarterlyPeriods
        : [undefined];

    let provisioned = 0;
    for (const user of targetUsers) {
      for (const period of periodsToProvision) {
        const created = await this.insertPostItForUser(user.id, user.companyId, template, period);
        provisioned += created;
      }
    }

    await this.templateRepository.update(template.id, { lastProvisionedAt: new Date() });
    this.logger.log(`Template ${template.id}: provisioned ${provisioned} post-its for ${targetUsers.length} users`);
    return provisioned;
  }

  /**
   * Provision post-its for a SINGLE new user without touching lastProvisionedAt.
   * Called from InvitationService when a new user is created.
   */
  async provisionForNewUser(
    userId: string,
    roleCode: string,
    companyId: string,
  ): Promise<number> {
    // Resolve the role UUID so we can match against targetRoleIds
    const role = await this.roleRepository.findOne({ where: { code: roleCode, companyId } });
    const roleId = role?.id;

    // Find templates targeting this role (by code legacy OR by UUID array) or this specific user
    const allTemplates = await this.templateRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.isActive = true')
      .andWhere('t.deletedAt IS NULL')
      .getMany();

    const templates = allTemplates.filter((t) => {
      if (t.targetUserId === userId) return true;
      if (t.targetRoleCode === roleCode) return true;
      if (roleId && t.targetRoleIds?.includes(roleId)) return true;
      return false;
    });

    if (!templates.length) return 0;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`provisionForNewUser: user ${userId} not found`);
      return 0;
    }

    let provisioned = 0;
    for (const template of templates) {
      // Skip specific_date templates that are already past their date
      if (template.recurrenceType === 'specific_date' && template.specificDateFrom) {
        if (template.specificDateFrom < new Date()) {
          // Still provision — new user should get it even if the date has passed
          // (they missed it because they weren't in the system yet)
        }
      }
      const created = await this.insertPostItForUser(userId, companyId, template);
      provisioned += created;
    }

    this.logger.log(`provisionForNewUser: provisioned ${provisioned} post-its for user ${userId} (role=${roleCode})`);
    return provisioned;
  }

  /**
   * Provision a template by ID. Used by the manual provision endpoint.
   */
  async provisionById(id: string, companyId: string): Promise<number> {
    const template = await this.templateRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Assigned post-it template ${id} not found`);
    }

    return this.provisionTemplate(template);
  }

  /**
   * Run all due templates across all companies (or a specific one).
   * Called by the scheduler.
   */
  async runDueTemplates(companyId?: string): Promise<void> {
    const qb = this.templateRepository
      .createQueryBuilder('t')
      .where('t.isActive = true')
      .andWhere('t.deletedAt IS NULL');

    if (companyId) {
      qb.andWhere('t.companyId = :companyId', { companyId });
    }

    const templates = await qb.getMany();
    const now = new Date();
    let processed = 0;

    for (const template of templates) {
      if (await this.isDue(template, now)) {
        try {
          await this.provisionTemplate(template);
          processed++;
        } catch (error) {
          this.logger.error(`Failed to provision template ${template.id}: ${error.message}`);
        }
      }
    }

    this.logger.log(`runDueTemplates: processed ${processed}/${templates.length} templates`);
  }

  private async isDue(template: AssignedPostItTemplate, now: Date): Promise<boolean> {
    // Si scheduleConfig existe, utiliser la nouvelle logique avancée
    if (template.scheduleConfig) {
      const currentSchoolYear = await this.schoolYearRepository.findOne({
        where: { companyId: template.companyId, isCurrent: true },
      });

      const allSchoolYears = await this.schoolYearRepository.find({
        where: { companyId: template.companyId },
        order: { startDate: 'ASC' },
      });

      const quarters = await this.schoolYearQuarterRepository.find({
        where: { companyId: template.companyId },
        order: { startDate: 'ASC' },
      });

      // Compter le nombre de périodes déjà provisionnées pour le mode n_times
      let provisionedCount = 0;
      if (template.scheduleConfig.recurrence.mode === 'n_times') {
        const raw = await this.postItRepository
          .createQueryBuilder('p')
          .select('COUNT(DISTINCT p.defaultPostItKey)', 'cnt')
          .where('p.defaultPostItKey LIKE :pat', {
            pat: `assigned_tpl_${template.id}_v2_%`,
          })
          .getRawOne<{ cnt: string }>();
        provisionedCount = parseInt(raw?.cnt ?? '0', 10);
      }

      return isAdvancedScheduleDue(template, now, currentSchoolYear, allSchoolYears, quarters, provisionedCount);
    }

    // Fallback : ancienne logique pour rétrocompatibilité
    const last = template.lastProvisionedAt;

    switch (template.recurrenceType) {
      case 'weekly': {
        if (!last) return true;
        const daysSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLast >= 7;
      }

      case 'monthly': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (now < monthStart) return false;
        if (!last) return true;
        return last < monthStart;
      }

      case 'quarterly': {
        // Due at the start of each trimester: Oct 1, Jan 1, Apr 1
        const trimesterStarts = this.getTrimesterStartDates(now);
        return trimesterStarts.some((start) => {
          if (now < start) return false;
          if (!last) return true;
          return last < start && now >= start;
        });
      }

      case 'annually': {
        // Due once per school year (on Oct 1 of startYear)
        const schoolYearStart = this.getSchoolYearStart(now);
        if (now < schoolYearStart) return false;
        if (!last) return true;
        return last < schoolYearStart;
      }

      case 'specific_date': {
        if (!template.specificDateFrom) return false;
        if (!last && now >= template.specificDateFrom) return true;
        return false;
      }

      default:
        return false;
    }
  }

  private getTrimesterStartDates(now: Date): Date[] {
    const year = now.getFullYear();
    // T1 starts Oct 1 of current or previous calendar year
    const t1 = new Date(year, 9, 1); // Oct 1
    const t2 = new Date(year, 0, 1); // Jan 1
    const t3 = new Date(year, 3, 1); // Apr 1
    const t4 = new Date(year, 5, 1); // Jun 1

    return [t1, t2, t3, t4];
  }

  private getSchoolYearStart(now: Date): Date {
    const year = now.getFullYear();
    const oct1 = new Date(year, 9, 1);
    // If we haven't reached Oct 1 of this year, the school year started Oct 1 of last year
    return now >= oct1 ? oct1 : new Date(year - 1, 9, 1);
  }

  private async resolveTargetUsers(template: AssignedPostItTemplate): Promise<User[]> {
    if (template.targetUserId) {
      const user = await this.userRepository.findOne({
        where: { id: template.targetUserId },
      });
      return user ? [user] : [];
    }

    // Use targetRoleIds (UUID array) when available — new frontend-facing templates
    if (template.targetRoleIds?.length > 0) {
      const userMap = new Map<string, User>();

      for (const roleId of template.targetRoleIds) {
        const users = await this.userRepository
          .createQueryBuilder('user')
          .innerJoin('user.userRoles', 'userRole')
          .where('userRole.roleId = :roleId', { roleId })
          .andWhere('user.status = :status', { status: 'active' })
          .andWhere('user.companyId = :companyId', { companyId: template.companyId })
          .getMany();

        for (const u of users) userMap.set(u.id, u);
      }

      return Array.from(userMap.values());
    }

    // Fallback: legacy targetRoleCode
    if (template.targetRoleCode) {
      const role = await this.roleRepository.findOne({
        where: { code: template.targetRoleCode, companyId: template.companyId },
      });

      if (!role) {
        this.logger.warn(`Role ${template.targetRoleCode} not found in company ${template.companyId}`);
        return [];
      }

      return this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.userRoles', 'userRole')
        .where('userRole.roleId = :roleId', { roleId: role.id })
        .andWhere('user.status = :status', { status: 'active' })
        .andWhere('user.companyId = :companyId', { companyId: template.companyId })
        .getMany();
    }

    return [];
  }

  private async insertPostItForUser(
    userId: string,
    companyId: string,
    template: AssignedPostItTemplate,
    quarterPeriod?: number,
  ): Promise<number> {
    try {
      const schoolYear = await this.getSchoolYearStartYear(companyId);
      const periodKey = this.buildPeriodKey(template, schoolYear, quarterPeriod);

      // Calculer la deadline en fonction du scheduleConfig
      let deadline: Date | null = null;
      if (template.scheduleConfig) {
        // Récupérer l'année scolaire complète pour calcul
        const schoolYearEntity = await this.schoolYearRepository.findOne({
          where: { companyId, isCurrent: true },
        });
        deadline = calculateDeadlineFromSchedule(template.scheduleConfig, new Date(), schoolYearEntity);
      } else if (template.specificDateFrom) {
        deadline = new Date(template.specificDateFrom);
      } else {
        // Fallback : 7 jours à partir de maintenant
        deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      const rows = await this.postItRepository.query(
        `
        INSERT INTO post_its (
          company_id, created_by_id, title, thematic, content,
          deadline, status, color, is_archived, is_priority,
          visible_from, is_default, default_post_it_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (created_by_id, default_post_it_key, deadline)
          WHERE is_default = true AND default_post_it_key IS NOT NULL AND deleted_at IS NULL
        DO NOTHING
        RETURNING id
        `,
        [
          companyId,
          userId,
          template.title,
          template.thematic,
          template.content,
          deadline,
          'en_cours',
          template.color,
          false,
          template.isPriority,
          null,
          true,
          `assigned_tpl_${template.id}_${periodKey}`,
        ],
      );

      return rows.length;
    } catch (error) {
      this.logger.error(
        `Failed to insert post-it for user ${userId}, template ${template.id}: ${error.message}`,
      );
      return 0;
    }
  }

  private buildPeriodKey(
    template: AssignedPostItTemplate,
    schoolYear: number | null,
    quarterPeriod?: number,
  ): string {
    // Si scheduleConfig existe, utiliser la nouvelle logique
    if (template.scheduleConfig) {
      return buildAdvancedPeriodKey(template.scheduleConfig, new Date());
    }

    // Fallback : ancienne logique
    const now = new Date();
    switch (template.recurrenceType) {
      case 'weekly': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return `w${weekStart.toISOString().slice(0, 10)}`;
      }
      case 'quarterly': {
        const yr = schoolYear ?? now.getFullYear();
        if (quarterPeriod !== undefined) {
          return `q${yr}_t${quarterPeriod}`;
        }
        const month = now.getMonth();
        let trimester: number;
        if (month >= 9) trimester = 1;
        else if (month <= 2) trimester = 2;
        else trimester = 3;
        return `q${yr}_t${trimester}`;
      }
      case 'annually': {
        const yr = schoolYear ?? now.getFullYear();
        return `y${yr}`;
      }
      case 'monthly': {
        return `m${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      case 'specific_date':
        return template.specificDateFrom
          ? `sd${template.specificDateFrom.toISOString().slice(0, 10)}`
          : `sd${now.toISOString().slice(0, 10)}`;
      default:
        return `unknown_${now.toISOString().slice(0, 10)}`;
    }
  }

  // ─── Tracking API methods ────────────────────────────────────────────────

  /**
   * Get all occurrences (past, present, future) for a template with completion stats
   */
  async getTrackingOccurrences(
    templateId: string,
    companyId: string,
  ): Promise<Array<{
    periodKey: string;
    label: string;
    date: Date;
    stats: { total: number; done: number; overdue: number; pending: number };
    provisioned: boolean;
  }>> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    // Query existing post-its grouped by period key only (not deadline — avoids duplicates when deadlines differ)
    const result = await this.postItRepository
      .createQueryBuilder('pi')
      .select('pi.default_post_it_key', 'key')
      .addSelect('MAX(pi.deadline)', 'deadline')
      .addSelect('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE pi.status = 'done')", 'done_count')
      .addSelect("COUNT(*) FILTER (WHERE pi.status = 'depasse')", 'overdue_count')
      .where('pi.is_default = true')
      .andWhere('pi.default_post_it_key LIKE :pattern', {
        pattern: `assigned_tpl_${templateId}_%`,
      })
      .andWhere('pi.deleted_at IS NULL')
      .groupBy('pi.default_post_it_key')
      .orderBy('MAX(pi.deadline)', 'DESC')
      .getRawMany();

    const occurrences = result.map((row) => {
      const periodKey = (row.key as string).replace(`assigned_tpl_${templateId}_`, '');
      const total = Number.parseInt(row.total, 10);
      const done = Number.parseInt(row.done_count, 10) || 0;
      const overdue = Number.parseInt(row.overdue_count, 10) || 0;

      return {
        periodKey,
        label: this.buildPeriodLabelHelper(periodKey),
        date: new Date(row.deadline),
        stats: {
          total,
          done,
          overdue,
          pending: total - done - overdue,
        },
        provisioned: true,
      };
    });

    occurrences.sort((a, b) => b.date.getTime() - a.date.getTime());

    return occurrences;
  }

  /**
   * Get users assigned to a specific period/occurrence with their completion status
   */
  async getTrackingUsers(
    templateId: string,
    companyId: string,
    periodKey: string,
    filters: {
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{
    users: Array<{
      postItId: string;
      userId: string;
      firstName: string;
      lastName: string;
      photoUrl?: string;
      status: string;
      deadline: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;

    const qb = this.postItRepository
      .createQueryBuilder('pi')
      .innerJoin('pi.createdBy', 'u')
      .select([
        'pi.id',
        'pi.status',
        'pi.deadline',
        'pi.updatedAt',
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.photoUrl',
      ])
      .where('pi.is_default = true')
      .andWhere('pi.default_post_it_key = :key', {
        key: `assigned_tpl_${templateId}_${periodKey}`,
      })
      .andWhere('pi.deleted_at IS NULL');

    if (filters.status) {
      qb.andWhere('pi.status = :status', { status: filters.status });
    }

    if (filters.search) {
      qb.andWhere(
        "(u.first_name ILIKE :search OR u.last_name ILIKE :search OR CONCAT(u.first_name, ' ', u.last_name) ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [postIts, total] = await qb.getManyAndCount();

    const users = postIts.map((pi) => ({
      postItId: pi.id,
      userId: pi.createdBy.id,
      firstName: pi.createdBy.firstName,
      lastName: pi.createdBy.lastName,
      photoUrl: pi.createdBy.photoUrl,
      status: pi.status,
      deadline: pi.deadline ?? (template.scheduleConfig
        ? calculateDeadlineFromSchedule(template.scheduleConfig, new Date(), null)
        : null),
      updatedAt: pi.updatedAt,
    }));

    return { users, total, page, pageSize };
  }

  /**
   * Backfill deadlines for all assigned post-its with deadline IS NULL
   * Uses the parent template's scheduleConfig to calculate the correct deadline
   */
  async backfillDeadlines(companyId: string): Promise<{
    updated: number;
    skipped: number;
    errors: number;
  }> {
    this.logger.log(`Starting deadline backfill for company ${companyId}`);

    // Find all default post-its with null deadline
    const postIts = await this.postItRepository.find({
      where: {
        companyId,
        isDefault: true,
        deadline: IsNull(),
        deletedAt: IsNull(),
      },
    });

    this.logger.log(`Found ${postIts.length} post-its with null deadline`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const postIt of postIts) {
      try {
        if (!postIt.defaultPostItKey) {
          skipped++;
          continue;
        }

        // Extract template ID from defaultPostItKey: "assigned_tpl_{templateId}_{periodKey}"
        const match = postIt.defaultPostItKey.match(/^assigned_tpl_([^_]+)_/);
        if (!match) {
          this.logger.warn(`Invalid defaultPostItKey format: ${postIt.defaultPostItKey}`);
          skipped++;
          continue;
        }

        const templateId = match[1];
        const template = await this.templateRepository.findOne({
          where: { id: templateId, companyId, deletedAt: IsNull() },
        });

        if (!template || !template.scheduleConfig) {
          this.logger.warn(`Template ${templateId} not found or has no scheduleConfig`);
          skipped++;
          continue;
        }

        // Get current school year for deadline calculation
        const schoolYear = await this.schoolYearRepository.findOne({
          where: { companyId, isCurrent: true },
        });

        // Calculate deadline from scheduleConfig
        const deadline = calculateDeadlineFromSchedule(
          template.scheduleConfig,
          postIt.createdAt,
          schoolYear,
        );

        // Update post-it with calculated deadline
        await this.postItRepository.update(postIt.id, { deadline });

        updated++;
        this.logger.debug(`Updated post-it ${postIt.id} with deadline ${deadline.toISOString()}`);
      } catch (error) {
        this.logger.error(`Error backfilling deadline for post-it ${postIt.id}: ${error.message}`);
        errors++;
      }
    }

    this.logger.log(`Deadline backfill complete: ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return { updated, skipped, errors };
  }

  /**
   * Force-complete a post-it for a user (admin override)
   * Creates the post-it if not yet provisioned
   */
  async forceComplete(
    templateId: string,
    companyId: string,
    userId: string,
    periodKey: string,
  ): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, companyId, deletedAt: IsNull() },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, companyId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const defaultPostItKey = `assigned_tpl_${templateId}_${periodKey}`;

    // Try to find existing post-it
    const existing = await this.postItRepository.findOne({
      where: {
        isDefault: true,
        defaultPostItKey,
        createdById: userId,
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      // Update existing
      existing.status = 'done';
      existing.updatedAt = new Date();
      await this.postItRepository.save(existing);
    } else {
      // Create new post-it directly as done (admin bypass)
      const newPostIt = this.postItRepository.create({
        companyId,
        createdById: userId,
        title: template.title,
        thematic: template.thematic,
        content: template.content,
        deadline: template.specificDateFrom ?? new Date(),
        status: 'done',
        color: template.color,
        isArchived: false,
        isPriority: template.isPriority,
        visibleFrom: null,
        isDefault: true,
        defaultPostItKey,
      });
      await this.postItRepository.save(newPostIt);
    }
  }

  private buildPeriodLabelHelper(periodKey: string): string {
    // Handle advanced keys (v2_*)
    if (periodKey.startsWith('v2_')) {
      const rest = periodKey.substring(3);
      
      // Weekly: v2_w2026-05-26
      if (rest.startsWith('w')) {
        const date = rest.substring(1);
        return `Semaine du ${new Date(date).toLocaleDateString('fr-FR')}`;
      }
      
      // Monthly: v2_m2026-06
      if (rest.startsWith('m')) {
        const parts = rest.substring(1).split('-');
        const year = parts[0];
        const month = parts[1];
        const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 1);
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      }
      
      // Quarterly: v2_q2026_t2
      if (rest.startsWith('q')) {
        const exec = /q(\d+)_t(\d+)/.exec(rest);
        if (exec) {
          const startYear = Number.parseInt(exec[1], 10);
          return `Trimestre ${exec[2]} — ${startYear}/${startYear + 1}`;
        }
      }
      
      // School year: v2_sy2026
      if (rest.startsWith('sy')) {
        const year = rest.substring(2);
        return `Année scolaire ${year}/${Number.parseInt(year, 10) + 1}`;
      }
      
      // Civil year: v2_cy2026
      if (rest.startsWith('cy')) {
        const year = rest.substring(2);
        return `Année ${year}`;
      }
      
      // Day of week: v2_dow2026-06-01
      if (rest.startsWith('dow')) {
        const date = rest.substring(3);
        return new Date(date).toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      }
      
      // Day of month: v2_dom2026-06-15
      if (rest.startsWith('dom')) {
        const date = rest.substring(3);
        return new Date(date).toLocaleDateString('fr-FR');
      }
      
      // Custom dates: v2_cd...
      if (rest.startsWith('cd')) {
        return `Date personnalisée`;
      }
    }

    // Handle legacy keys
    // Weekly: w2026-05-26
    if (periodKey.startsWith('w')) {
      const date = periodKey.substring(1);
      return `Semaine du ${new Date(date).toLocaleDateString('fr-FR')}`;
    }
    
    // Monthly: m2026-06
    if (periodKey.startsWith('m')) {
      const parts = periodKey.substring(1).split('-');
      const year = parts[0];
      const month = parts[1];
      const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    
    // Quarterly: q2025_t1
    if (periodKey.startsWith('q')) {
      const exec = /q(\d+)_t(\d+)/.exec(periodKey);
      if (exec) {
        const startYear = Number.parseInt(exec[1], 10);
        return `Trimestre ${exec[2]} — ${startYear}/${startYear + 1}`;
      }
    }
    
    // Annually: y2025
    if (periodKey.startsWith('y')) {
      const year = periodKey.substring(1);
      return `Année ${year}`;
    }
    
    // Specific date: sd2026-06-15
    if (periodKey.startsWith('sd')) {
      const date = periodKey.substring(2);
      return new Date(date).toLocaleDateString('fr-FR');
    }

    return periodKey;
  }

  /**
   * Retourne les prochaines occurrences pour un template (mode custom_pick)
   * Utilisé par le frontend pour afficher la liste des occurrences à cocher
   */
  async getNextOccurrences(
    templateId: string,
    companyId: string,
    count: number = 12,
  ): Promise<Array<{ key: string; label: string; date: Date }>> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, companyId },
    });

    if (!template || !template.scheduleConfig) {
      throw new NotFoundException('Template not found or has no schedule config');
    }

    const config = template.scheduleConfig;
    const occurrences: Array<{ key: string; label: string; date: Date }> = [];
    const now = new Date();

    // Générer les N prochaines occurrences selon le type
    switch (config.type) {
      case 'weekly': {
        let current = new Date(now);
        for (let i = 0; i < count; i++) {
          occurrences.push({
            key: buildAdvancedPeriodKey(config, current),
            label: `Semaine du ${current.toLocaleDateString('fr-FR')}`,
            date: new Date(current),
          });
          current.setDate(current.getDate() + 7);
        }
        break;
      }
      case 'monthly': {
        let current = new Date(now.getFullYear(), now.getMonth(), 1);
        for (let i = 0; i < count; i++) {
          occurrences.push({
            key: buildAdvancedPeriodKey(config, current),
            label: current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
            date: new Date(current),
          });
          current.setMonth(current.getMonth() + 1);
        }
        break;
      }
      case 'quarterly': {
        const quarters = await this.schoolYearQuarterRepository.find({
          where: { companyId },
          order: { startDate: 'ASC' },
        });
        let added = 0;
        for (const q of quarters) {
          if (new Date(q.startDate) >= now && added < count) {
            occurrences.push({
              key: buildAdvancedPeriodKey(config, new Date(q.startDate)),
              label: `Trimestre ${q.number}`,
              date: new Date(q.startDate),
            });
            added++;
          }
        }
        break;
      }
      case 'school_year': {
        const schoolYears = await this.schoolYearRepository.find({
          where: { companyId },
          order: { startDate: 'ASC' },
        });
        let added = 0;
        for (const sy of schoolYears) {
          if (new Date(sy.startDate) >= now && added < count) {
            occurrences.push({
              key: buildAdvancedPeriodKey(config, new Date(sy.startDate)),
              label: sy.code,
              date: new Date(sy.startDate),
            });
            added++;
          }
        }
        break;
      }
      case 'civil_year': {
        let current = new Date(now.getFullYear(), 0, 1);
        for (let i = 0; i < count; i++) {
          occurrences.push({
            key: buildAdvancedPeriodKey(config, current),
            label: `${current.getFullYear()}`,
            date: new Date(current),
          });
          current.setFullYear(current.getFullYear() + 1);
        }
        break;
      }
      default: {
        // Pour les autres types, générer des occurrences mensuelles par défaut
        let current = new Date(now.getFullYear(), now.getMonth(), 1);
        for (let i = 0; i < count; i++) {
          occurrences.push({
            key: buildAdvancedPeriodKey(config, current),
            label: current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
            date: new Date(current),
          });
          current.setMonth(current.getMonth() + 1);
        }
        break;
      }
    }

    return occurrences;
  }

  /**
   * Retrieves the start year of the current school year for a given company.
   * @param companyId - The company ID
   * @returns The start year (e.g., 2025 for school year 2025-2026) or null if not found
   */
  private async getSchoolYearStartYear(companyId: string): Promise<number | null> {
    const schoolYear = await this.schoolYearRepository.findOne({
      where: { companyId, isCurrent: true },
    });

    if (!schoolYear) {
      this.logger.warn(`No current school year found for company ${companyId}`);
      return null;
    }

    const startYear = new Date(schoolYear.startDate).getFullYear();
    return startYear;
  }
}
