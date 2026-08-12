import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BrandingService } from './branding.service';
import { Company } from '../companies/entities/company.entity';
import { Branding } from './entities/branding.entity';
import { Theme } from './entities/theme.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { DocumentTemplate } from './entities/document-template.entity';
import { UiConfiguration } from './entities/ui-configuration.entity';
import { AuditLogService } from '../audit/audit.service';

const mockRepo = () => ({ find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), softDelete: jest.fn() });
const companyQbMock = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
});

describe('BrandingService', () => {
  let service: BrandingService;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let brandingRepository: jest.Mocked<Repository<Branding>>;
  let themeRepository: jest.Mocked<Repository<Theme>>;
  let uiConfigRepository: jest.Mocked<Repository<UiConfiguration>>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingService,
        {
          provide: getRepositoryToken(Company),
          useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn().mockImplementation(companyQbMock) },
        },
        { provide: getRepositoryToken(Branding), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(Theme), useValue: mockRepo() },
        { provide: getRepositoryToken(MediaAsset), useValue: mockRepo() },
        { provide: getRepositoryToken(EmailTemplate), useValue: mockRepo() },
        { provide: getRepositoryToken(DocumentTemplate), useValue: mockRepo() },
        { provide: getRepositoryToken(UiConfiguration), useValue: { findOne: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<BrandingService>(BrandingService);
    companyRepository = module.get(getRepositoryToken(Company));
    brandingRepository = module.get(getRepositoryToken(Branding));
    themeRepository = module.get(getRepositoryToken(Theme));
    uiConfigRepository = module.get(getRepositoryToken(UiConfiguration));
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicByCompanyCode', () => {
    it('should throw NotFoundException when company not found', async () => {
      const qb = companyQbMock();
      (companyRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (qb.getOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getPublicByCompanyCode('UNKNOWN')).rejects.toThrow(NotFoundException);
    });

    it('should return logo, theme and uiConfig', async () => {
      const company = { id: 'c1', code: 'ACME', logoUrl: 'https://logo.png' } as Company;
      const qb = companyQbMock();
      (companyRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (qb.getOne as jest.Mock).mockResolvedValue(company);
      brandingRepository.findOne.mockResolvedValue(null);
      themeRepository.findOne.mockResolvedValue(null);
      uiConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.getPublicByCompanyCode('ACME');

      expect(result.logoUrl).toBe('https://logo.png');
      expect(result.theme).toBeNull();
      expect(result.uiConfig).toEqual({});
    });
  });
});
