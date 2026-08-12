import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RulesService } from './rules.service';
import { Rule } from './entities/rule.entity';
import { RuleOverride } from './entities/rule-override.entity';
import { AuditLogService } from '../audit/audit.service';
import { CreateRuleDto } from './dto/create-rule.dto';

describe('RulesService', () => {
  let service: RulesService;
  let ruleRepository: jest.Mocked<Repository<Rule>>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: getRepositoryToken(Rule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RuleOverride),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
    ruleRepository = module.get(getRepositoryToken(Rule));
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a rule and audit', async () => {
      const dto: CreateRuleDto = { name: 'Rule 1', scope: 'COMPANY', priority: 1 };
      const created = { id: 'rule-1', companyId, ...dto } as Rule;
      ruleRepository.create.mockReturnValue(created);
      ruleRepository.save.mockResolvedValue(created);

      const result = await service.create(companyId, dto, 'user-1');

      expect(result).toEqual(created);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'rules', action: 'CREATE' }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when rule not found', async () => {
      ruleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', companyId)).rejects.toThrow(NotFoundException);
    });
  });
});
