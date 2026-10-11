import { Test, TestingModule } from '@nestjs/testing';

import { DocumentParserService } from '../documents/services/document-parser.service';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';

describe('AssistantController', () => {
  let controller: AssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        { provide: AssistantService, useValue: { chat: jest.fn() } },
        { provide: DocumentParserService, useValue: { parse: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
