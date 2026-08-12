import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TokenRevocationService } from './token-revocation.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock; decode: jest.Mock };
  let tokenRevocation: { revoke: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };
    tokenRevocation = {
      revoke: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: TokenRevocationService, useValue: tokenRevocation },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('rejects invalid login credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'a@b.com', password: 'Password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns access token and public user on success', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@zupdeco.fr',
      role: 'STUDENT',
      password: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: 'demo@zupdeco.fr',
      password: 'Password123',
    });

    expect(result.access_token).toBe('signed-token');
    expect(result.user).toEqual({
      id: 'u1',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@zupdeco.fr',
      role: 'STUDENT',
    });
    expect(result.user).not.toHaveProperty('password');
  });

  it('revokes token on logout', async () => {
    await service.logout('bearer-token-value');
    expect(tokenRevocation.revoke).toHaveBeenCalled();
  });
});
