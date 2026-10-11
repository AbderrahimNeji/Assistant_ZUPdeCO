import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let prisma: {
    conversation: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      conversation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MemoryService,
          useValue: {
            resolveLeafForActivation: jest.fn(),
            setActivePath: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ConversationService);
  });

  it('lists conversations for the owning user only', async () => {
    prisma.conversation.findMany.mockResolvedValue([]);
    await service.findAll('user-1');
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
  });

  it('throws when conversation is missing', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);
    await expect(service.findOne('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when delete affects no rows', async () => {
    prisma.conversation.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.delete('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
