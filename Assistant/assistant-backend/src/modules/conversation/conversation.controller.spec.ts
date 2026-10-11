import { Test, TestingModule } from '@nestjs/testing';

import { DocumentParserService } from '../documents/services/document-parser.service';
import { ConversationAttachmentService } from './conversation-attachment.service';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

describe('ConversationController', () => {
  let controller: ConversationController;
  const conversationService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        { provide: ConversationService, useValue: conversationService },
        {
          provide: ConversationAttachmentService,
          useValue: { createMany: jest.fn() },
        },
        { provide: DocumentParserService, useValue: { parse: jest.fn() } },
      ],
    }).compile();

    controller = module.get(ConversationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should list conversations for the authenticated user', async () => {
    conversationService.findAll.mockResolvedValue([]);
    await expect(
      controller.findAll({ user: { id: 'user-1' } }),
    ).resolves.toEqual([]);
    expect(conversationService.findAll).toHaveBeenCalledWith('user-1');
  });
});
