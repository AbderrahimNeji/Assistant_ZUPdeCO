import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityTypeService } from './activity-type.service';
import { ActivityType } from './entities/activity-type.entity';
import { AuditLogService } from '../audit/audit.service';

const companyId = 'company-1';

describe('ActivityTypeService', () => {
  let service: ActivityTypeService;
  let repository: jest.Mocked<Repository<ActivityType>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTypeService,
        {
          provide: getRepositoryToken(ActivityType),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ActivityTypeService>(ActivityTypeService);
    repository = module.get(getRepositoryToken(ActivityType));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportAll', () => {
    it('returns a Buffer with valid .xlsx (PK) header', async () => {
      repository.find.mockResolvedValue([
        {
          id: '1',
          companyId,
          code: 'TUTO',
          label: 'Tutorat',
          description: 'Séance de tutorat',
          status: 'active',
        } as ActivityType,
      ]);

      const buf = await service.exportAll(companyId);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('returns a Buffer even when there are no records', async () => {
      repository.find.mockResolvedValue([]);

      const buf = await service.exportAll(companyId);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    });
  });
});
