import { createHash, randomUUID } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenRevocationService {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async revoke(token: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.prisma.revokedToken.upsert({
      where: { tokenHash },
      create: { tokenHash, expiresAt },
      update: { expiresAt },
    });
  }

  async isRevoked(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const entry = await this.prisma.revokedToken.findUnique({
      where: { tokenHash },
      select: { expiresAt: true },
    });

    if (!entry) {
      return false;
    }

    if (entry.expiresAt.getTime() <= Date.now()) {
      void this.prisma.revokedToken
        .delete({ where: { tokenHash } })
        .catch(() => undefined);
      return false;
    }

    return true;
  }

  async assertNotRevoked(token: string): Promise<void> {
    if (await this.isRevoked(token)) {
      throw new UnauthorizedException('Session has been revoked');
    }
  }

  /** Best-effort purge of expired denylist rows. */
  async purgeExpired(): Promise<number> {
    const result = await this.prisma.revokedToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return result.count;
  }
}

export function newWorkerId(): string {
  return `worker-${randomUUID()}`;
}
