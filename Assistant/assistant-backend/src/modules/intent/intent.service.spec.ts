import { Test, TestingModule } from '@nestjs/testing';

import { IntentService } from './intent.service';

describe('IntentService', () => {
  let service: IntentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentService],
    }).compile();

    service = module.get<IntentService>(IntentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('classifies greetings locally', () => {
    expect(service.detectIntent('Hello there')).toEqual({
      intent: 'Greeting',
      category: 'Conversation',
      confidence: 0.9,
    });
  });

  it('classifies document questions locally', () => {
    expect(service.detectIntent('résumé moi ça')).toMatchObject({
      intent: 'DocumentQuestion',
      category: 'Knowledge',
    });
  });
});
