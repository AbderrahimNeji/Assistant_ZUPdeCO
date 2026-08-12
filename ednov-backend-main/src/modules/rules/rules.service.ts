import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rule } from './entities/rule.entity';
import { RuleOverride } from './entities/rule-override.entity';
import { AuditLogService } from '../audit/audit.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { CreateRuleOverrideDto } from './dto/create-rule-override.dto';
import { UpdateRuleOverrideDto } from './dto/update-rule-override.dto';

@Injectable()
export class RulesService {
  constructor(
    @InjectRepository(Rule)
    private readonly ruleRepository: Repository<Rule>,
    @InjectRepository(RuleOverride)
    private readonly overrideRepository: Repository<RuleOverride>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(companyId: string, dto: CreateRuleDto, actorId?: string): Promise<Rule> {
    const entity = this.ruleRepository.create({ ...dto, companyId });
    const saved = await this.ruleRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rules',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAll(companyId: string): Promise<Rule[]> {
    return this.ruleRepository.find({
      where: { companyId },
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Rule> {
    const rule = await this.ruleRepository.findOne({ where: { id, companyId } });
    if (!rule) throw new NotFoundException(`Rule ${id} not found`);
    return rule;
  }

  async update(id: string, companyId: string, dto: UpdateRuleDto, actorId?: string): Promise<Rule> {
    const rule = await this.findOne(id, companyId);
    const oldValue = { ...rule } as unknown as Record<string, unknown>;
    Object.assign(rule, dto);
    const saved = await this.ruleRepository.save(rule);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rules',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async remove(id: string, companyId: string, actorId?: string): Promise<void> {
    const rule = await this.findOne(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rules',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: rule.id, name: rule.name } as Record<string, unknown>,
    });
    await this.ruleRepository.delete(id);
  }

  async findOverrides(ruleId: string, companyId: string): Promise<RuleOverride[]> {
    await this.findOne(ruleId, companyId);
    return this.overrideRepository.find({
      where: { ruleId },
      order: { createdAt: 'DESC' },
    });
  }

  async createOverride(
    ruleId: string,
    companyId: string,
    dto: CreateRuleOverrideDto,
    actorId?: string,
  ): Promise<RuleOverride> {
    await this.findOne(ruleId, companyId);
    const entity = this.overrideRepository.create({
      ...dto,
      ruleId,
      companyId: dto.companyId ?? companyId,
    });
    const saved = await this.overrideRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rule_overrides',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findOneOverride(
    ruleId: string,
    overrideId: string,
    companyId: string,
  ): Promise<RuleOverride> {
    await this.findOne(ruleId, companyId);
    const override = await this.overrideRepository.findOne({
      where: { id: overrideId, ruleId },
    });
    if (!override) throw new NotFoundException(`Rule override ${overrideId} not found`);
    return override;
  }

  async updateOverride(
    ruleId: string,
    overrideId: string,
    companyId: string,
    dto: UpdateRuleOverrideDto,
    actorId?: string,
  ): Promise<RuleOverride> {
    const override = await this.findOneOverride(ruleId, overrideId, companyId);
    const oldValue = { ...override } as unknown as Record<string, unknown>;
    Object.assign(override, dto);
    const saved = await this.overrideRepository.save(override);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rule_overrides',
      entityId: overrideId,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeOverride(ruleId: string, overrideId: string, companyId: string, actorId?: string): Promise<void> {
    const override = await this.findOneOverride(ruleId, overrideId, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rule_overrides',
      entityId: overrideId,
      action: 'DELETE',
      oldValue: { id: override.id } as Record<string, unknown>,
    });
    await this.overrideRepository.delete(overrideId);
  }
}
