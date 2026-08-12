import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySetting } from './entities/company-setting.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AuditLogService } from '../audit/audit.service';
import { PutSettingsDto } from './dto/put-settings.dto';
import { PutFeatureFlagsDto } from './dto/put-feature-flags.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CompanySetting)
    private readonly settingRepository: Repository<CompanySetting>,
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepository: Repository<FeatureFlag>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getSettings(companyId: string): Promise<Record<string, unknown>> {
    const rows = await this.settingRepository.find({
      where: { companyId },
    });
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.key] = row.value;
    }
    return out;
  }

  async putSettings(companyId: string, dto: PutSettingsDto, actorId?: string): Promise<Record<string, unknown>> {
    const keys = Object.keys(dto.settings);
    for (const key of keys) {
      const value = dto.settings[key];
      let row = await this.settingRepository.findOne({ where: { companyId, key } });
      const oldValue = row ? { ...row.value } : undefined;
      if (row) {
        row.value = value as Record<string, unknown>;
        await this.settingRepository.save(row);
      } else {
        row = this.settingRepository.create({ companyId, key, value: value as Record<string, unknown> });
        await this.settingRepository.save(row);
      }
      await this.auditLogService.log({
        companyId,
        userId: actorId,
        entity: 'company_settings',
        entityId: row.id,
        action: oldValue ? 'UPDATE' : 'CREATE',
        oldValue: oldValue as Record<string, unknown>,
        newValue: value as Record<string, unknown>,
      });
    }
    return this.getSettings(companyId);
  }

  async getFeatureFlags(companyId: string): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      where: { companyId },
      order: { key: 'ASC' },
    });
  }

  async putFeatureFlags(companyId: string, dto: PutFeatureFlagsDto, actorId?: string): Promise<FeatureFlag[]> {
    for (const item of dto.flags) {
      let row = await this.featureFlagRepository.findOne({ where: { companyId, key: item.key } });
      const oldValue = row ? { enabled: row.enabled, config: row.config } : undefined;
      if (row) {
        row.enabled = item.enabled;
        row.config = (item.config ?? {}) as Record<string, unknown>;
        await this.featureFlagRepository.save(row);
      } else {
        row = this.featureFlagRepository.create({
          companyId,
          key: item.key,
          enabled: item.enabled,
          config: (item.config ?? {}) as Record<string, unknown>,
        });
        await this.featureFlagRepository.save(row);
      }
      await this.auditLogService.log({
        companyId,
        userId: actorId,
        entity: 'feature_flags',
        entityId: row.id,
        action: oldValue ? 'UPDATE' : 'CREATE',
        oldValue: oldValue as Record<string, unknown>,
        newValue: { key: item.key, enabled: item.enabled, config: item.config } as Record<string, unknown>,
      });
    }
    return this.getFeatureFlags(companyId);
  }
}
