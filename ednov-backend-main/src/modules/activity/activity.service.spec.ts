import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService } from './activity.service';
import { Activity } from './entities/activity.entity';
import { AuditLogService } from '../audit/audit.service';

const companyId = 'company-1';

describe('ActivityService', () => {
  let service: ActivityService;
  let repository: jest.Mocked<Repository<Activity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getRepositoryToken(Activity),
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

    service = module.get<ActivityService>(ActivityService);
    repository = module.get(getRepositoryToken(Activity));
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
          code: 'ACT1',
          label: 'Activité 1',
          activityTypeName: 'Tutorat',
          description: 'Description',
          status: 'active',
        } as Activity,
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
