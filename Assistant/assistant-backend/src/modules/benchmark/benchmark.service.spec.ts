import { NotFoundException } from '@nestjs/common';
import { BenchmarkJobStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('franc', () => ({ franc: () => 'eng' }));

import { PrismaService } from '../../prisma/prisma.service';
import { AssistantService } from '../assistant/assistant.service';
import { EmbeddingService } from '../documents/services/embedding.service';
import { BenchmarkService } from './benchmark.service';

describe('BenchmarkService jobs', () => {
  let service: BenchmarkService;
  let prisma: {
    benchmarkJob: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    benchmarkRun: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      benchmarkJob: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      benchmarkRun: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenchmarkService,
        { provide: PrismaService, useValue: prisma },
        { provide: AssistantService, useValue: { chat: jest.fn() } },
        {
          provide: EmbeddingService,
          useValue: { embed: jest.fn().mockResolvedValue([0.1, 0.2]) },
        },
      ],
    }).compile();

    service = module.get(BenchmarkService);
    jest
      .spyOn(service as unknown as { loadDataset: () => unknown[] }, 'loadDataset')
      .mockReturnValue([{ question: 'Q?', expectedAnswer: 'A' }]);
    jest
      .spyOn(
        service as unknown as {
          executeBenchmarkJob: (...args: unknown[]) => Promise<void>;
        },
        'executeBenchmarkJob',
      )
      .mockResolvedValue(undefined);
  });

  it('persists async jobs instead of keeping them only in memory', async () => {
    const started = await service.startBenchmarkJob('user-1', 'benchmark');
    expect(started.jobId).toBeTruthy();
    expect(prisma.benchmarkJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          dataset: 'benchmark',
          status: BenchmarkJobStatus.PENDING,
        }),
      }),
    );
  });

  it('scopes job progress to the owning user', async () => {
    prisma.benchmarkJob.findFirst.mockResolvedValue(null);
    await expect(
      service.getJobProgress('job-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
