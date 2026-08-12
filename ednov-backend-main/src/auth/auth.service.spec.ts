import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/entities/user-role.entity';
import { Role } from '../modules/roles/entities/role.entity';

const mockUserWithRoles = (): User =>
  ({
    id: 'user-uuid-1',
    companyId: 'company-1',
    firebaseUid: 'firebase-uid-1',
    status: 'active',
    deletedAt: null,
    userRoles: [
      { role: { code: 'admin' } } as UserRole & { role: Role },
      { role: { code: 'teacher' } } as UserRole & { role: Role },
    ],
  } as User);

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: getRepositoryToken(UserRole), useValue: {} },
        { provide: getRepositoryToken(Role), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserByFirebaseUid', () => {
    it('should return user payload with id, companyId and roleCodes', async () => {
      const user = mockUserWithRoles();
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.getUserByFirebaseUid('firebase-uid-1');

      expect(result).toEqual({
        id: 'user-uuid-1',
        companyId: 'company-1',
        roleCodes: ['admin', 'teacher'],
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-1' },
        relations: ['userRoles', 'userRoles.role'],
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserByFirebaseUid('unknown-uid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is soft-deleted', async () => {
      const user = mockUserWithRoles();
      user.deletedAt = new Date();
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.getUserByFirebaseUid('firebase-uid-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user status is deactivated', async () => {
      const user = mockUserWithRoles();
      user.status = 'deactivated';
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.getUserByFirebaseUid('firebase-uid-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user payload when user has tutor role', async () => {
      const user = mockUserWithRoles();
      user.userRoles = [{ role: { code: 'tutor' } } as UserRole & { role: Role }];
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.getUserByFirebaseUid('firebase-uid-1');

      expect(result).toEqual({
        id: 'user-uuid-1',
        companyId: 'company-1',
        roleCodes: ['tutor'],
      });
    });
  });
});
