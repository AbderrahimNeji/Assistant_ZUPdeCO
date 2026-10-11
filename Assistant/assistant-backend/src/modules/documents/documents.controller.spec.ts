import { Test, TestingModule } from '@nestjs/testing';

import { DocumentsService } from './documents.service';
import { DocumentParserService } from './services/document-parser.service';
import { DocumentStorageService } from './services/document-storage.service';
import { EmbeddingService } from './services/embedding.service';
import { RetrievalService } from './services/retrieval.service';
import { DocumentsController } from './documents.controller';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  const embeddingService = { embed: jest.fn() };
  const retrievalService = { search: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: { findAll: jest.fn() } },
        { provide: DocumentParserService, useValue: { parse: jest.fn() } },
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: DocumentStorageService, useValue: { save: jest.fn() } },
        { provide: RetrievalService, useValue: retrievalService },
      ],
    }).compile();

    controller = module.get(DocumentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('search should embed the question and retrieve user-scoped results', async () => {
    embeddingService.embed.mockResolvedValue([0.1, 0.2]);
    retrievalService.search.mockResolvedValue([
      { score: 0.9, content: 'RAG context from the handbook' },
    ]);

    await expect(
      controller.search(
        { user: { id: 'user-1' } },
        { question: 'What is RAG?' },
      ),
    ).resolves.toEqual({
      question: 'What is RAG?',
      results: [{ score: 0.9, chunk: 'RAG context from the handbook' }],
    });

    expect(embeddingService.embed).toHaveBeenCalledWith('What is RAG?');
    expect(retrievalService.search).toHaveBeenCalledWith(
      'user-1',
      [0.1, 0.2],
      5,
    );
  });
});
