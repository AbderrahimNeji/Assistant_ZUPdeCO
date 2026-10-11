import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('liveness should report the process is up', () => {
    const result = service.liveness();
    expect(result.status).toBe('alive');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('readiness should report connected when the database query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.readiness()).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        database: 'connected',
      }),
    );
  });

  it('readiness should report disconnected when the database query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));

    await expect(service.readiness()).resolves.toEqual(
      expect.objectContaining({
        status: 'not_ready',
        database: 'disconnected',
      }),
    );
  });

  it('check should mark the service degraded when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));

    await expect(service.check()).resolves.toEqual(
      expect.objectContaining({
        status: 'degraded',
        database: 'disconnected',
      }),
    );
  });
});
