import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { Establishment } from './entities/establishment.entity';
import { Room } from './entities/room.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { EstablishmentCoordinator } from './entities/establishment-coordinator.entity';
import { AuditLogService } from '../audit/audit.service';
import { ContactFunctionsService } from './contact-functions.service';
import { SpecialtiesService } from '../specialties/specialties.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { CreateCompanyDto } from './dto/create-company.dto';

const mockCompany = (): Company =>
  ({
    id: 'company-1',
    code: 'ACME',
    name: 'Acme Corp',
    status: 'active',
  } as Company);

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let establishmentRepository: jest.Mocked<Repository<Establishment>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: { find: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(EstablishmentCoordinator),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Session),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(SchoolClass),
          useValue: { find: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: VisibilityScopeResolverService,
          useValue: { applyToQueryBuilder: jest.fn() },
        },
        {
          provide: ContactFunctionsService,
          useValue: {},
        },
        {
          provide: SpecialtiesService,
          useValue: {},
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    companyRepository = module.get(getRepositoryToken(Company));
    establishmentRepository = module.get(getRepositoryToken(Establishment));
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateCompanyDto = { code: 'ACME', name: 'Acme Corp' };

    it('should create a company', async () => {
      const company = mockCompany();
      companyRepository.findOne.mockResolvedValue(null);
      companyRepository.create.mockReturnValue(company);
      companyRepository.save.mockResolvedValue(company);

      const result = await service.create(dto);

      expect(result).toEqual(company);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'companies' }),
      );
    });

    it('should throw ConflictException if code already exists', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany());
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return company', async () => {
      const company = mockCompany();
      companyRepository.findOne.mockResolvedValue(company);
      expect(await service.findOne('company-1')).toEqual(company);
    });

    it('should throw NotFoundException when not found', async () => {
      companyRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete company and audit', async () => {
      const company = mockCompany();
      companyRepository.findOne.mockResolvedValue(company);
      companyRepository.softDelete.mockResolvedValue({ affected: 1 } as never);

      await service.remove('company-1');

      expect(companyRepository.softDelete).toHaveBeenCalledWith('company-1');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });
  });

  describe('findEstablishments vscCount', () => {
    const companyId = 'company-1';
    const estA = { id: 'est-a', companyId, name: 'School A' } as Establishment;
    const estB = { id: 'est-b', companyId, name: 'School B' } as Establishment;

    const mockQueryBuilder = () => {
      const qb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[estA, estB], 2]),
        getSql: jest.fn().mockReturnValue(''),
        getParameters: jest.fn().mockReturnValue({}),
      };
      return qb;
    };

    it('should attach vscCount per establishment from active volunteers', async () => {
      const qb = mockQueryBuilder();
      establishmentRepository.createQueryBuilder.mockReturnValue(qb as never);
      dataSource.query.mockResolvedValue([
        { establishment_id: 'est-a', vsc_count: '3' },
        { establishment_id: 'est-b', vsc_count: '1' },
      ]);

      const result = await service.findEstablishments(companyId, 1, 20);

      expect(result.data[0].vscCount).toBe(3);
      expect(result.data[1].vscCount).toBe(1);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(r.code) = \'volunteer\''),
        [companyId, ['est-a', 'est-b']],
      );
    });

    it('should set vscCount to 0 when establishment has no linked volunteers', async () => {
      const qb = mockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[estA], 1]);
      establishmentRepository.createQueryBuilder.mockReturnValue(qb as never);
      dataSource.query.mockResolvedValue([]);

      const result = await service.findEstablishments(companyId, 1, 20);

      expect(result.data[0].vscCount).toBe(0);
    });

    it('should not query vsc counts when page is empty', async () => {
      const qb = mockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      establishmentRepository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.findEstablishments(companyId, 1, 20);

      expect(result.data).toEqual([]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });
});
