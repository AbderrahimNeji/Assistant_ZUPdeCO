import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AcademicService } from './academic.service';
import { Program } from './entities/program.entity';
import { Level } from './entities/level.entity';
import { Subject } from './entities/subject.entity';
import { SchoolYear } from './entities/school-year.entity';
import { Holiday } from './entities/holiday.entity';
import { VacationZone } from './entities/vacation-zone.entity';
import { SchoolClass } from './entities/school-class.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { AuditLogService } from '../audit/audit.service';
import { CreateProgramDto } from './dto/create-program.dto';

const companyId = 'company-1';

const makeRepoMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
  delete: jest.fn(),
});

describe('AcademicService', () => {
  let service: AcademicService;
  let programRepository: jest.Mocked<Repository<Program>>;
  let levelRepository: jest.Mocked<Repository<Level>>;
  let subjectRepository: jest.Mocked<Repository<Subject>>;
  let schoolYearRepository: jest.Mocked<Repository<SchoolYear>>;
  let holidayRepository: jest.Mocked<Repository<Holiday>>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: getRepositoryToken(Program), useValue: makeRepoMock() },
        { provide: getRepositoryToken(Level), useValue: makeRepoMock() },
        { provide: getRepositoryToken(Subject), useValue: makeRepoMock() },
        { provide: getRepositoryToken(SchoolYear), useValue: makeRepoMock() },
        { provide: getRepositoryToken(Holiday), useValue: makeRepoMock() },
        { provide: getRepositoryToken(VacationZone), useValue: makeRepoMock() },
        { provide: getRepositoryToken(SchoolClass), useValue: makeRepoMock() },
        { provide: getRepositoryToken(Establishment), useValue: makeRepoMock() },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<AcademicService>(AcademicService);
    programRepository = module.get(getRepositoryToken(Program));
    levelRepository = module.get(getRepositoryToken(Level));
    subjectRepository = module.get(getRepositoryToken(Subject));
    schoolYearRepository = module.get(getRepositoryToken(SchoolYear));
    holidayRepository = module.get(getRepositoryToken(Holiday));
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('programs', () => {
    it('should create a program', async () => {
      const dto: CreateProgramDto = { code: 'P1', name: 'Program 1' };
      programRepository.findOne.mockResolvedValue(null);
      const created = { id: 'prog-1', companyId, code: 'P1', name: 'Program 1' } as Program;
      programRepository.create.mockReturnValue(created);
      programRepository.save.mockResolvedValue(created);

      const result = await service.createProgram(companyId, dto, 'user-1');

      expect(result).toEqual(created);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'programs', action: 'CREATE' }),
      );
    });

    it('should throw ConflictException when program code exists', async () => {
      const dto: CreateProgramDto = { code: 'P1', name: 'Program 1' };
      programRepository.findOne.mockResolvedValue({ id: 'existing', code: 'P1' } as Program);

      await expect(service.createProgram(companyId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when program not found', async () => {
      programRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneProgram('missing', companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('export methods', () => {
    it('exportSubjects returns a non-empty Buffer with valid .xlsx header', async () => {
      subjectRepository.find.mockResolvedValue([
        { id: '1', code: 'MAT', label: 'Mathématiques', educationCycle: 'primary', isCore: true, status: 'active' } as Subject,
      ]);
      const buf = await service.exportSubjects(companyId);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('exportSubjects returns a buffer even with no records', async () => {
      subjectRepository.find.mockResolvedValue([]);
      const buf = await service.exportSubjects(companyId);
      expect(Buffer.isBuffer(buf)).toBe(true);
    });

    it('exportLevels returns a non-empty Buffer with valid .xlsx header', async () => {
      levelRepository.find.mockResolvedValue([
        { id: '1', code: 'CM1', label: 'CM1', educationCycle: 'primary', minAge: 9, maxAge: 10, status: 'active' } as Level,
      ]);
      const buf = await service.exportLevels(companyId);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('exportPrograms returns a non-empty Buffer with valid .xlsx header', async () => {
      programRepository.find.mockResolvedValue([
        { id: '1', code: 'P1', name: 'Programme 1', startDate: new Date('2024-09-01'), endDate: new Date('2025-06-30'), status: 'active' } as Program,
      ]);
      const buf = await service.exportPrograms(companyId);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('exportSchoolYears returns a non-empty Buffer with valid .xlsx header', async () => {
      schoolYearRepository.find.mockResolvedValue([
        { id: '1', code: '2024-25', startDate: new Date('2024-09-01'), endDate: new Date('2025-06-30'), isCurrent: true, status: 'active' } as SchoolYear,
      ]);
      const buf = await service.exportSchoolYears(companyId);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('exportHolidays returns a non-empty Buffer with valid .xlsx header', async () => {
      holidayRepository.find.mockResolvedValue([
        { id: '1', name: 'Noël', type: 'national', startDate: new Date('2024-12-23'), endDate: new Date('2025-01-03'), description: null, vacationZone: null } as Holiday,
      ]);
      const buf = await service.exportHolidays(companyId);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });
  });
});
