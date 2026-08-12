import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from './settings.service';
import { CompanySetting } from './entities/company-setting.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AuditLogService } from '../audit/audit.service';
import { PutSettingsDto } from './dto/put-settings.dto';
import { PutFeatureFlagsDto } from './dto/put-feature-flags.dto';

describe('SettingsService', () => {
  let service: SettingsService;
  let settingRepository: jest.Mocked<Repository<CompanySetting>>;
  let featureFlagRepository: jest.Mocked<Repository<FeatureFlag>>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(CompanySetting),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FeatureFlag),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    settingRepository = module.get(getRepositoryToken(CompanySetting));
    featureFlagRepository = module.get(getRepositoryToken(FeatureFlag));
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return settings as key-value object', async () => {
      const rows = [
        { id: '1', companyId, key: 'timezone', value: { v: 'Europe/Paris' } },
        { id: '2', companyId, key: 'locale', value: { v: 'fr' } },
      ] as unknown as CompanySetting[];
      settingRepository.find.mockResolvedValue(rows);

      const result = await service.getSettings(companyId);

      expect(result).toEqual({ timezone: { v: 'Europe/Paris' }, locale: { v: 'fr' } });
    });
  });

  describe('putSettings', () => {
    it('should upsert and audit', async () => {
      const dto: PutSettingsDto = { settings: { timezone: 'Europe/Paris' } };
      settingRepository.findOne.mockResolvedValue(null);
      const created = { id: 'new-id', companyId, key: 'timezone', value: 'Europe/Paris' } as unknown as CompanySetting;
      settingRepository.create.mockReturnValue(created);
      settingRepository.save.mockResolvedValue(created);
      settingRepository.find.mockResolvedValue([created]);

      await service.putSettings(companyId, dto, 'user-1');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'company_settings', companyId }),
      );
    });
  });

  describe('getFeatureFlags', () => {
    it('should return feature flags list', async () => {
      const flags = [{ id: '1', companyId, key: 'feature_a', enabled: true, config: {} }] as FeatureFlag[];
      featureFlagRepository.find.mockResolvedValue(flags);

      const result = await service.getFeatureFlags(companyId);

      expect(result).toEqual(flags);
    });
  });

  describe('putFeatureFlags', () => {
    it('should upsert flags and audit', async () => {
      const dto: PutFeatureFlagsDto = { flags: [{ key: 'feature_a', enabled: true }] };
      featureFlagRepository.findOne.mockResolvedValue(null);
      const created = { id: 'f1', companyId, key: 'feature_a', enabled: true, config: {} } as FeatureFlag;
      featureFlagRepository.create.mockReturnValue(created);
      featureFlagRepository.save.mockResolvedValue(created);
      featureFlagRepository.find.mockResolvedValue([created]);

      await service.putFeatureFlags(companyId, dto, 'user-1');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'feature_flags', companyId }),
      );
    });
  });
});
