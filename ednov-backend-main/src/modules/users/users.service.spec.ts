import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserEstablishment } from './entities/user-establishment.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Role } from '../roles/entities/role.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { SessionStudentTutorPair } from '../sessions/entities/session-student-tutor-pair.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { BinomeCoeur } from '../sessions/entities/binome-coeur.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { UserProfileSpecialty } from '../specialties/entities/user-profile-specialty.entity';
import { EstablishmentSpecialty } from '../specialties/entities/establishment-specialty.entity';
import { Specialty } from '../specialties/entities/specialty.entity';
import { InterfaceElement } from '../interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../interface-elements/entities/role-interface-element.entity';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../audit/audit.service';
import { StudentStatusHistoryService } from '../student-status-history/student-status-history.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

const ESTABLISHMENT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
/** Must be a valid UUID — parseRoleIds only accepts fallback role IDs that pass isValidUuid. */
const STUDENT_ROLE_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const mockUser = (): User =>
  ({
    id: 'user-1',
    firebaseUid: 'firebase-uid-1',
    email: 'test@example.com',
    companyId: 'company-1',
    status: 'registered',
  } as User);

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let studentStatusHistoryService: jest.Mocked<
    Pick<StudentStatusHistoryService, 'record' | 'findByStudentUserId'>
  >;
  let establishmentRepository: jest.Mocked<Repository<Establishment>>;
  let userEstablishmentRepository: jest.Mocked<Repository<UserEstablishment>>;
  let userRoleRepository: jest.Mocked<Repository<UserRole>>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserEstablishment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SessionStudentTutorPair),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(SessionParticipant),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(BinomeCoeur),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(SchoolClass),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserProfileSpecialty),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(EstablishmentSpecialty),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Specialty),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(InterfaceElement),
          useValue: { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(RoleInterfaceElement),
          useValue: { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Subject),
          useValue: { find: jest.fn(), findOne: jest.fn(), findBy: jest.fn() },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: StudentStatusHistoryService,
          useValue: {
            record: jest.fn(),
            findByStudentUserId: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS' ? 3 : undefined,
            ),
          },
        },
        {
          provide: VisibilityScopeResolverService,
          useValue: {
            resolveVisibilityScopeForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    configService = module.get(ConfigService) as { get: jest.Mock };
    userRepository = module.get(getRepositoryToken(User));
    auditLogService = module.get(AuditLogService);
    studentStatusHistoryService = module.get(StudentStatusHistoryService);
    establishmentRepository = module.get(getRepositoryToken(Establishment));
    userEstablishmentRepository = module.get(getRepositoryToken(UserEstablishment));
    userRoleRepository = module.get(getRepositoryToken(UserRole));

    userRoleRepository.find.mockResolvedValue([]);
    establishmentRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ id: ESTABLISHMENT_ID }),
    } as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMe', () => {
    it('should return user by id', async () => {
      const user = mockUser();
      userRepository.findOne.mockResolvedValue(user);
      const result = await service.findMe('user-1');
      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: ['company', 'userRoles', 'userRoles.role', 'userProfiles'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.findMe('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users for a company', async () => {
      const users = [mockUser()];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([users, 1]),
      };
      userRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll('company-1', 1, 20);
      expect(result).toEqual({
        data: users,
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qb.getManyAndCount).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rejects when establishments do not belong to company', async () => {
      userRepository.findOne.mockResolvedValue(null);
      establishmentRepository.find.mockResolvedValue([]);

      const dto: CreateUserDto = {
        firebaseUid: 'firebase-new',
        establishmentIds: [ESTABLISHMENT_ID],
      };

      await expect(service.create('company-1', dto, 'actor-1')).rejects.toThrow(
        'One or more establishments do not exist',
      );
    });

    it('creates user with establishment links when valid', async () => {
      const created = { ...mockUser(), id: 'new-user-id' };
      establishmentRepository.find.mockResolvedValue([
        { id: ESTABLISHMENT_ID, companyId: 'company-1' } as Establishment,
      ]);
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created as User);
      userRepository.create.mockImplementation((u) => u as User);
      userRepository.save.mockResolvedValue(created as User);
      userEstablishmentRepository.delete.mockResolvedValue({ affected: 1 } as never);
      userEstablishmentRepository.create.mockImplementation((x) => x as UserEstablishment);
      userEstablishmentRepository.save.mockResolvedValue([] as never);

      const dto: CreateUserDto = {
        firebaseUid: 'firebase-new',
        establishmentIds: [ESTABLISHMENT_ID],
      };

      const result = await service.create('company-1', dto, 'actor-1');
      expect(result.id).toBe('new-user-id');
      expect(userEstablishmentRepository.save).toHaveBeenCalled();
      expect(studentStatusHistoryService.record).not.toHaveBeenCalled();
    });

    it('records student_status_history on create when student role (initial status)', async () => {
      const created = {
        ...mockUser(),
        id: 'new-student-id',
        status: 'registered' as const,
      };
      establishmentRepository.find.mockResolvedValue([
        { id: ESTABLISHMENT_ID, companyId: 'company-1' } as Establishment,
      ]);
      userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(created as User);
      userRepository.create.mockImplementation((u) => u as User);
      userRepository.save.mockResolvedValue(created as User);
      userEstablishmentRepository.delete.mockResolvedValue({ affected: 1 } as never);
      userEstablishmentRepository.create.mockImplementation((x) => x as UserEstablishment);
      userEstablishmentRepository.save.mockResolvedValue([] as never);
      userRoleRepository.delete.mockResolvedValue({ affected: 0 } as never);
      userRoleRepository.create.mockImplementation((x) => x as UserRole);
      userRoleRepository.save.mockResolvedValue({} as UserRole);
      userRoleRepository.find.mockResolvedValue([
        { role: { code: 'STUDENT' } } as UserRole,
      ]);

      const roleRepo = (service as unknown as { roleRepository: Repository<Role> }).roleRepository as jest.Mocked<
        Repository<Role>
      >;
      roleRepo.find.mockResolvedValue([
        { id: STUDENT_ROLE_ID, code: 'STUDENT', label: 'Élève', companyId: 'company-1' } as Role,
      ]);

      const dto: CreateUserDto = {
        firebaseUid: 'firebase-student',
        establishmentIds: [ESTABLISHMENT_ID],
        roleIds: [STUDENT_ROLE_ID],
      };

      await service.create('company-1', dto, 'actor-1');

      expect(studentStatusHistoryService.record).toHaveBeenCalledWith({
        studentUserId: 'new-student-id',
        updatedByUserId: 'actor-1',
        oldStatus: null,
        newStatus: 'registered',
      });
    });
  });

  describe('update', () => {
    it('should update and audit the user', async () => {
      const user = mockUser();
      const dto: UpdateUserDto = { firstName: 'Jane' };
      const updated = { ...user, ...dto } as User;
      userRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(updated)
        .mockResolvedValueOnce({ id: 'actor-1' } as User)
        .mockResolvedValueOnce(updated);
      userRepository.save.mockResolvedValue(updated);

      const result = await service.update('user-1', 'company-1', dto, 'actor-1');

      expect(userRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: 'user-1', companyId: 'company-1' },
        relations: expect.any(Array),
      });
      expect(result.firstName).toBe('Jane');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityId: 'user-1' }),
      );
    });

    it('records student_status_history when student status changes via PATCH', async () => {
      const user = { ...mockUser(), status: 'registered' as const };
      const updated = { ...user, status: 'accompanied' as const };
      userRoleRepository.find.mockResolvedValue([
        { role: { code: 'STUDENT' } } as UserRole,
      ]);
      userRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(updated)
        .mockResolvedValueOnce({ id: 'actor-1' } as User)
        .mockResolvedValueOnce(updated);
      userRepository.save.mockResolvedValue(updated);

      await service.update('user-1', 'company-1', { status: 'accompanied' }, 'actor-1');

      expect(studentStatusHistoryService.record).toHaveBeenCalledWith({
        studentUserId: 'user-1',
        updatedByUserId: 'actor-1',
        oldStatus: 'registered',
        newStatus: 'accompanied',
      });
    });
  });

  describe('accompanied session threshold', () => {
    it('studentReactivationTargetFromPresentCount follows STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS', () => {
      configService.get.mockImplementation((k: string) =>
        k === 'STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS' ? 5 : undefined,
      );
      expect(service.studentReactivationTargetFromPresentCount(4)).toBe('registered');
      expect(service.studentReactivationTargetFromPresentCount(5)).toBe('accompanied');
      configService.get.mockImplementation((k: string) =>
        k === 'STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS' ? 3 : undefined,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete the user and audit', async () => {
      const user = mockUser();
      userRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ id: 'actor-1' } as User);
      userRepository.softDelete.mockResolvedValue({ affected: 1 } as never);

      await service.remove('user-1', 'company-1', 'actor-1');

      expect(userRepository.findOne).toHaveBeenLastCalledWith({ where: { id: 'actor-1' } });
      expect(userRepository.softDelete).toHaveBeenCalledWith('user-1');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });
  });

  describe('importUsersFromCsv', () => {
    it('imports valid rows', async () => {
      establishmentRepository.find.mockResolvedValue([
        { id: ESTABLISHMENT_ID, companyId: 'company-1' } as Establishment,
      ]);
      userEstablishmentRepository.delete.mockResolvedValue({ affected: 0 } as never);
      userEstablishmentRepository.create.mockImplementation((x) => x as UserEstablishment);
      userEstablishmentRepository.save.mockResolvedValue([] as never);

      const roleQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: STUDENT_ROLE_ID } as Role),
      };
      const userQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser()),
      };
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      const userRepo = (service as any).userRepository as jest.Mocked<Repository<User>>;
      roleRepo.createQueryBuilder.mockReturnValue(roleQb as any);
      roleRepo.find.mockResolvedValue([
        { id: STUDENT_ROLE_ID, companyId: 'company-1', code: 'STUDENT', label: 'Student' } as Role,
      ]);
      userRepo.findOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
        const w = opts?.where ?? {};
        if (w.firebaseUid != null) return Promise.resolve(null);
        if (w.companyId != null && w.email != null) return Promise.resolve(null);
        if (w.id != null && w.companyId != null) {
          return Promise.resolve({ ...mockUser(), id: String(w.id), companyId: String(w.companyId) } as User);
        }
        return Promise.resolve(null);
      });
      userRepo.create.mockImplementation((u) => u as any);
      userRepo.save.mockResolvedValue(mockUser() as any);
      userRepo.createQueryBuilder.mockReturnValue(userQb as any);

      const file = {
        buffer: Buffer.from(
          `firstName,lastName,email,establishmentId\nJohn,Doe,john@example.com,${ESTABLISHMENT_ID}\n`,
        ),
      } as Express.Multer.File;

      const result = await service.importUsersFromCsv('company-1', file, 'actor-1', {});
      expect(result.importedCount).toBe(1);
      expect(result.invalidCount).toBe(0);
      expect(result.skippedExistingEmailCount).toBe(0);
    });

    it('skips existing email rows', async () => {
      const roleQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: STUDENT_ROLE_ID } as Role),
      };
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      const userRepo = (service as any).userRepository as jest.Mocked<Repository<User>>;
      roleRepo.createQueryBuilder.mockReturnValue(roleQb as any);
      userRepo.findOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
        const w = opts?.where ?? {};
        if (w.companyId != null && w.email === 'john@example.com') {
          return Promise.resolve({
            ...mockUser(),
            id: 'existing-user',
            email: 'john@example.com',
          } as User);
        }
        return Promise.resolve(null);
      });

      const file = {
        buffer: Buffer.from(
          `firstName,lastName,email,establishmentId\nJohn,Doe,john@example.com,${ESTABLISHMENT_ID}\n`,
        ),
      } as Express.Multer.File;

      const result = await service.importUsersFromCsv('company-1', file, 'actor-1', {});
      expect(result.importedCount).toBe(0);
      expect(result.skippedExistingEmailCount).toBe(1);
    });

    it('returns invalid rows with reasons', async () => {
      const roleQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: STUDENT_ROLE_ID } as Role),
      };
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      roleRepo.createQueryBuilder.mockReturnValue(roleQb as any);

      const file = {
        buffer: Buffer.from(
          `firstName,lastName,email,establishmentId\nJohn,,bad-email,${ESTABLISHMENT_ID}\n`,
        ),
      } as Express.Multer.File;

      const result = await service.importUsersFromCsv('company-1', file, 'actor-1', {});
      expect(result.importedCount).toBe(0);
      expect(result.invalidCount).toBe(1);
      expect(result.errors[0].reason).toBe('MISSING_REQUIRED_FIELD');
    });

    it('returns ROLE_NOT_FOUND when no STUDENT role exists and no role provided', async () => {
      const roleQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      roleRepo.createQueryBuilder.mockReturnValue(roleQb as any);

      const file = {
        buffer: Buffer.from(
          `firstName,lastName,email,establishmentId\nJohn,Doe,john@example.com,${ESTABLISHMENT_ID}\n`,
        ),
      } as Express.Multer.File;

      const result = await service.importUsersFromCsv('company-1', file, 'actor-1', {});
      expect(result.importedCount).toBe(0);
      expect(result.invalidCount).toBe(1);
      expect(result.errors[0].reason).toBe('ROLE_NOT_FOUND');
    });
  });

  describe('exportAdminsCsv', () => {
    function makeRoleQb(roles: Partial<{ id: string; code: string; label: string }>[]) {
      return {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(roles),
      };
    }

    function makeUserQb(users: Partial<User>[]) {
      return {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
      };
    }

    it('returns a Buffer with valid .xlsx (PK) header when admins exist', async () => {
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      roleRepo.createQueryBuilder.mockReturnValue(makeRoleQb([{ id: 'role-1', code: 'ADMIN', label: 'Administrateur' }]) as any);

      userRepository.createQueryBuilder.mockReturnValue(
        makeUserQb([
          {
            id: 'u1',
            displayName: 'Alice Dupont',
            email: 'alice@test.com',
            phone: '0601020304',
            status: 'active',
            createdAt: new Date('2024-01-01'),
            userRoles: [{ role: { code: 'ADMIN', label: 'Administrateur' } }] as any,
          } as User,
        ]) as any,
      );

      const buf = await service.exportAdminsCsv('company-1');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('returns a buffer with header row only when no roles found', async () => {
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      roleRepo.createQueryBuilder.mockReturnValue(makeRoleQb([]) as any);

      const buf = await service.exportAdminsCsv('company-1');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('returns a buffer with header row only when no matching role codes', async () => {
      const roleRepo = (service as any).roleRepository as jest.Mocked<Repository<Role>>;
      roleRepo.createQueryBuilder.mockReturnValue(
        makeRoleQb([{ id: 'role-1', code: 'ADMIN', label: 'Administrateur' }]) as any,
      );

      const buf = await service.exportAdminsCsv('company-1', { roleCodes: ['COORDINATOR'] });
      expect(Buffer.isBuffer(buf)).toBe(true);
    });
  });
});
