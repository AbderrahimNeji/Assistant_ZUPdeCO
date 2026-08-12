import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from './documents.service';
import { ChunkService } from './services/chunk.service';
import { EmbeddingService } from './services/embedding.service';
import { DocumentStorageService } from './services/document-storage.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    document: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChunkService, useValue: {} },
        { provide: EmbeddingService, useValue: {} },
        { provide: DocumentStorageService, useValue: {} },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  it('lists documents scoped to the user', async () => {
    await service.findAll('user-1');
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
  });
});
