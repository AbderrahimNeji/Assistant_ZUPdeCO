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
    conversation: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn(),
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

  it('saveMessage should persist a message with default tree fields', async () => {
    prisma.message.create.mockResolvedValue({ id: 'm1' });

    await service.saveMessage('c1', 'user', 'Hello');

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'c1',
        role: 'user',
        content: 'Hello',
        parentMessageId: null,
        branchId: expect.any(String),
        version: 1,
      },
    });
  });

  it('saveMessage should persist explicit tree fields', async () => {
    prisma.message.create.mockResolvedValue({ id: 'm2' });

    await service.saveMessage(
      'c1',
      'assistant',
      'Answer',
      undefined,
      undefined,
      undefined,
      undefined,
      {
        parentMessageId: 'user-1',
        branchId: 'branch-a',
        version: 2,
      },
    );

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'c1',
        role: 'assistant',
        content: 'Answer',
        parentMessageId: 'user-1',
        branchId: 'branch-a',
        version: 2,
      },
    });
  });

  it('getRecentMessages should return chronological last N messages on the active path', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'c1',
      activeBranchId: 'b1',
      activeLeafId: '3',
    });
    prisma.message.findMany.mockResolvedValue([
      {
        id: '1',
        role: 'user',
        content: 'first',
        parentMessageId: null,
        branchId: 'b1',
        version: 1,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'second',
        parentMessageId: '1',
        branchId: 'b1',
        version: 1,
        createdAt: new Date('2026-01-02'),
      },
      {
        id: '3',
        role: 'user',
        content: 'third',
        parentMessageId: '2',
        branchId: 'b1',
        version: 1,
        createdAt: new Date('2026-01-03'),
      },
    ]);

    const result = await service.getRecentMessages('c1', 2);

    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'c1' },
      select: {
        id: true,
        activeBranchId: true,
        activeLeafId: true,
      },
    });
    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'c1' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        role: true,
        content: true,
        parentMessageId: true,
        branchId: true,
        version: true,
        createdAt: true,
      },
    });
    expect(result.map((m) => m.id)).toEqual(['2', '3']);
  });

  it('getRecentMessages should ignore sibling branches off the active path', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'c1',
      activeBranchId: 'b',
      activeLeafId: '3',
    });
    prisma.message.findMany.mockResolvedValue([
      {
        id: '1',
        role: 'user',
        content: 'root',
        parentMessageId: null,
        branchId: 'a',
        version: 1,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'other branch',
        parentMessageId: '1',
        branchId: 'a',
        version: 1,
        createdAt: new Date('2026-01-02'),
      },
      {
        id: '3',
        role: 'assistant',
        content: 'active branch',
        parentMessageId: '1',
        branchId: 'b',
        version: 2,
        createdAt: new Date('2026-01-03'),
      },
    ]);

    const result = await service.getRecentMessages('c1', 10);

    expect(result.map((m) => m.id)).toEqual(['1', '3']);
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
        parentMessageId: null,
        branchId: expect.any(String),
        version: 1,
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
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'c1',
      activeBranchId: null,
      activeLeafId: null,
    });
    prisma.message.findMany.mockResolvedValue([]);

    await expect(service.getRecentMessages('c1', 10)).resolves.toEqual([]);
  });

  it('getRecentMessages should return empty array when limit <= 0', async () => {
    await expect(service.getRecentMessages('c1', 0)).resolves.toEqual([]);
    expect(prisma.message.findMany).not.toHaveBeenCalled();
    expect(prisma.conversation.findUnique).not.toHaveBeenCalled();
  });
});
