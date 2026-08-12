import {
  Injectable,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenRevocationService } from './token-revocation.service';

const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} as const;

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN?.trim() || '24h';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocation: TokenRevocationService,
  ) {}

  async register(dto: RegisterDto) {
    if (process.env.ENABLE_PUBLIC_REGISTER !== 'true') {
      throw new ForbiddenException(
        'Public registration is disabled. Contact an administrator for access.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        role: UserRole.STUDENT,
      },
      select: USER_PUBLIC_SELECT,
    });

    return {
      message: 'User created successfully',
      user,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      expires_in: ACCESS_TOKEN_TTL,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    return user;
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) {
      return { success: true };
    }

    try {
      const decoded = this.jwtService.decode(rawToken) as {
        exp?: number;
      } | null;
      const expiresAt =
        decoded?.exp != null
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000);

      if (expiresAt.getTime() > Date.now()) {
        await this.tokenRevocation.revoke(rawToken, expiresAt);
      }
    } catch {
      // Still acknowledge logout even if token decode fails.
    }

    return { success: true };
  }
}
