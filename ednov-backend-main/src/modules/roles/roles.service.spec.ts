import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { RolesService } from './roles.service';
import { RoleInterfaceBindingsService } from './role-interface-bindings.service';
import { Role } from './entities/role.entity';
import { AuditLogService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';

const mockRole = (overrides: Partial<Role> = {}): Role =>
  ({
    id: 'role-1',
    code: 'VOLUNTEER',
    label: 'Volunteer',
    companyId: 'company-1',
    isSystem: false,
    status: 'active',
    roleGroup: 'operations',
    ...overrides,
  } as Role);

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let roleInterfaceBindingsService: RoleInterfaceBindingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
        {
          provide: RoleInterfaceBindingsService,
          useValue: {
            deleteAllForRole: jest.fn().mockResolvedValue(undefined),
            replaceBindingsWithManager: jest.fn().mockResolvedValue(undefined),
            cloneBindingsWithManager: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (fn: (em: unknown) => Promise<Role>) => {
              const em = {
                getRepository: () => ({
                  create: jest.fn((x: Partial<Role>) => ({ ...mockRole(), ...x })),
                  save: jest.fn(async (x: Role) => x),
                }),
              };
              return fn(em);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get(getRepositoryToken(Role));
    auditLogService = module.get(AuditLogService);
    roleInterfaceBindingsService = module.get(RoleInterfaceBindingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateRoleDto = { code: 'VOLUNTEER', label: 'Volunteer' };

    it('should create a role', async () => {
      const role = mockRole();
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue(role);
      roleRepository.save.mockResolvedValue(role);

      const result = await service.create('company-1', dto);

      expect(result).toEqual(role);
      expect(roleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VOLUNTEER', roleGroup: 'operations', companyId: 'company-1' }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'roles' }),
      );
    });

    it('should throw ConflictException if code already taken', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole());
      await expect(service.create('company-1', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException for system roles', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole({ isSystem: true }));
      await expect(service.update('role-1', 'company-1', { label: 'New' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update a non-system role', async () => {
      const role = mockRole();
      roleRepository.findOne.mockResolvedValue(role);
      roleRepository.save.mockResolvedValue({ ...role, label: 'Updated' } as Role);

      const result = await service.update('role-1', 'company-1', { label: 'Updated' });

      expect(result.label).toBe('Updated');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException for system roles', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole({ isSystem: true }));
      await expect(service.remove('role-1', 'company-1')).rejects.toThrow(ForbiddenException);
    });

    it('should soft-delete a non-system role', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole());
      roleRepository.softDelete.mockResolvedValue({ affected: 1 } as never);

      await service.remove('role-1', 'company-1');

      expect(roleInterfaceBindingsService.deleteAllForRole).toHaveBeenCalledWith(
        'company-1',
        'role-1',
      );
      expect(roleRepository.softDelete).toHaveBeenCalledWith('role-1');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing', 'company-1')).rejects.toThrow(NotFoundException);
    });
  });
});