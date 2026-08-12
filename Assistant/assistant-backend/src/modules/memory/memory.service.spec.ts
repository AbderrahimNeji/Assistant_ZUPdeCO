import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from './memory.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let prisma: {
    message: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('saveMessage should persist a message', async () => {
    prisma.message.create.mockResolvedValue({ id: 'm1' });

    await service.saveMessage('c1', 'user', 'Hello');

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'c1',
        role: 'user',
        content: 'Hello',
      },
    });
  });

  it('getRecentMessages should return chronological last N messages', async () => {
    prisma.message.findMany.mockResolvedValue([
      { id: '3', content: 'third', createdAt: new Date('2026-01-03') },
      { id: '2', content: 'second', createdAt: new Date('2026-01-02') },
    ]);

    const result = await service.getRecentMessages('c1', 2);

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'c1' },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
    expect(result.map((m) => m.id)).toEqual(['2', '3']);
  });

  it('saveMessage should persist sources for assistant replies', async () => {
    prisma.message.create.mockResolvedValue({ id: 'm2' });

    await service.saveMessage('c1', 'assistant', 'Answer', [
      {
        kind: 'document_kb',
        label: 'handbook.pdf',
        icon: '📄',
        pages: [1, 2],
        document: 'handbook.pdf',
        page: 1,
      },
    ]);

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'c1',
        role: 'assistant',
        content: 'Answer',
        sources: [
          {
            kind: 'document_kb',
            label: 'handbook.pdf',
            icon: '📄',
            pages: [1, 2],
            document: 'handbook.pdf',
            page: 1,
          },
        ],
      },
    });
  });

  it('getRecentMessages should return empty array for empty conversation', async () => {
    prisma.message.findMany.mockResolvedValue([]);

    await expect(service.getRecentMessages('c1', 10)).resolves.toEqual([]);
  });

  it('getRecentMessages should return empty array when limit <= 0', async () => {
    await expect(service.getRecentMessages('c1', 0)).resolves.toEqual([]);
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });
});
