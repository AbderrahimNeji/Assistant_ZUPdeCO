import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoleInterfaceBindingsService } from './role-interface-bindings.service';
import { RoleInterfaceElement } from '../interface-elements/entities/role-interface-element.entity';
import { InterfaceElement } from '../interface-elements/entities/interface-element.entity';
import { Role } from './entities/role.entity';
import { AuditLogService } from '../audit/audit.service';

describe('RoleInterfaceBindingsService', () => {
  let service: RoleInterfaceBindingsService;
  let rieRepo: jest.Mocked<Pick<Repository<RoleInterfaceElement>, 'find' | 'count' | 'delete'>>;
  let elementRepo: jest.Mocked<Pick<Repository<InterfaceElement>, 'find'>>;
  let roleRepo: jest.Mocked<Pick<Repository<Role>, 'findOne'>>;
  let dataSource: { transaction: jest.Mock };
  let auditLogService: { log: jest.Mock };

  beforeEach(async () => {
    rieRepo = {
      find: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };
    elementRepo = {
      find: jest.fn(),
    };
    roleRepo = {
      findOne: jest.fn(),
    };
    auditLogService = { log: jest.fn() };
    dataSource = {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<void>) => {
        const em = {
          find: jest.fn(),
          delete: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue({}),
          create: jest.fn((_cls: unknown, row: unknown) => row),
        };
        await fn(em);
        return em;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleInterfaceBindingsService,
        { provide: getRepositoryToken(RoleInterfaceElement), useValue: rieRepo },
        { provide: getRepositoryToken(InterfaceElement), useValue: elementRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(RoleInterfaceBindingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listBindings', () => {
    it('throws NotFoundException when role missing', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.listBindings('c1', 'r1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('replaceBindings', () => {
    it('throws ForbiddenException for system roles', async () => {
      roleRepo.findOne.mockResolvedValue({
        id: 'r1',
        companyId: 'c1',
        isSystem: true,
      } as Role);

      await expect(service.replaceBindings('c1', 'r1', [])).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequest when element not in company', async () => {
      roleRepo.findOne.mockResolvedValue({
        id: 'r1',
        companyId: 'c1',
        isSystem: false,
      } as Role);
      elementRepo.find.mockResolvedValue([]);

      await expect(
        service.replaceBindings('c1', 'r1', [{ elementId: 'missing-uuid' }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('replaces bindings in a transaction and audits', async () => {
      const elId = '11111111-1111-1111-1111-111111111111';
      roleRepo.findOne.mockResolvedValue({
        id: 'r1',
        companyId: 'c1',
        isSystem: false,
      } as Role);
      elementRepo.find.mockResolvedValue([{ id: elId, companyId: 'c1' } as InterfaceElement]);
      rieRepo.count.mockResolvedValue(1);

      let capturedEm: { delete: jest.Mock; save: jest.Mock; find: jest.Mock };
      dataSource.transaction.mockImplementation(async (fn: (em: unknown) => Promise<void>) => {
        const em = {
          find: jest.fn().mockResolvedValue([{ id: elId, companyId: 'c1' }]),
          delete: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue({}),
          create: jest.fn((_cls: unknown, row: unknown) => row),
        };
        capturedEm = em;
        await fn(em);
      });

      await service.replaceBindings('c1', 'r1', [{ elementId: elId, canEdit: true }], 'actor-1');

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(capturedEm!.delete).toHaveBeenCalledWith(RoleInterfaceElement, {
        companyId: 'c1',
        roleId: 'r1',
      });
      expect(capturedEm!.save).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'role_interface_elements',
          action: 'UPDATE',
          newValue: expect.objectContaining({ bindingCount: 1 }),
        }),
      );
    });
  });

  describe('deleteAllForRole', () => {
    it('calls repository delete', async () => {
      rieRepo.delete.mockResolvedValue({ affected: 3, raw: [] } as never);
      await service.deleteAllForRole('c1', 'r1');
      expect(rieRepo.delete).toHaveBeenCalledWith({ companyId: 'c1', roleId: 'r1' });
    });
  });
});
