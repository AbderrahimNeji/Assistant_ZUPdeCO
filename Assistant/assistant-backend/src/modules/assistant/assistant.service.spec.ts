jest.mock('../documents/services/embedding.service', () => ({
  EmbeddingService: class EmbeddingService {},
}));
jest.mock('../language/language.service', () => ({
  LanguageService: class LanguageService {},
}));
jest.mock('../intent/intent.service', () => ({
  IntentService: class IntentService {},
}));
jest.mock('../llm/llm.service', () => ({
  LlmService: class LlmService {},
}));

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ConversationAttachmentService } from '../conversation/conversation-attachment.service';
import { EmbeddingService } from '../documents/services/embedding.service';
import { IntentService } from '../intent/intent.service';
import { KnowledgeOrchestratorService } from '../knowledge/knowledge-orchestrator.service';
import { LanguageService } from '../language/language.service';
import { LlmService } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import {
  PromptBuilderService,
  RAG_INSUFFICIENT_CONTEXT_MESSAGE,
} from '../prompt-builder/prompt-builder.service';
import { ToolOrchestratorService } from '../actions/tool-orchestrator.service';
import { ToolRegistry } from '../actions/tool.registry';
import { PlannerService } from '../actions/planner.service';
import { AssistantService } from './assistant.service';
import { ProactiveSuggestionFacade } from './suggestions/proactive-suggestion.facade';
import { EvaluationRecorderService } from '../evaluation/evaluation-recorder.service';
import { SmallTalkService } from '../small-talk/small-talk.service';

describe('AssistantService', () => {
  let service: AssistantService;

  const prisma = {
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const memoryService = {
    getRecentMessages: jest.fn(),
    saveMessage: jest.fn(),
  };

  const embeddingService = {
    embed: jest.fn(),
  };

  const knowledgeOrchestrator = {
    retrieve: jest.fn(),
  };

  const toolOrchestrator = {
    handle: jest.fn(),
  };

  const toolRegistry = {
    tools: [{ id: 'enrollment' }, { id: 'course' }],
  };

  const planner = {
    plan: jest.fn().mockReturnValue({
      mode: 'rag',
      reason: 'test',
      confidence: 0.9,
      steps: [],
      includeRag: true,
    }),
  };

  const proactiveSuggestions = {
    build: jest.fn().mockResolvedValue([]),
  };

  const evaluationRecorder = {
    recordFromTrace: jest.fn(),
  };

  const smallTalk = {
    match: jest.fn().mockReturnValue(null),
  };

  const attachmentService = {
    createMany: jest.fn(),
  };

  const llmService = {
    ask: jest.fn(),
    askWithMeta: jest.fn(),
  };

  const promptBuilderService = {
    buildRagPrompt: jest.fn(),
  };

  const languageService = {
    detectLanguage: jest.fn().mockResolvedValue('English'),
  };

  const intentService = {
    detectIntent: jest.fn().mockReturnValue({
      intent: 'GeneralQuestion',
      category: 'Conversation',
      confidence: 0.6,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: PrismaService, useValue: prisma },
        { provide: LlmService, useValue: llmService },
        { provide: LanguageService, useValue: languageService },
        { provide: IntentService, useValue: intentService },
        { provide: MemoryService, useValue: memoryService },
        { provide: EmbeddingService, useValue: embeddingService },
        {
          provide: KnowledgeOrchestratorService,
          useValue: knowledgeOrchestrator,
        },
        {
          provide: ConversationAttachmentService,
          useValue: attachmentService,
        },
        { provide: PromptBuilderService, useValue: promptBuilderService },
        { provide: ToolOrchestratorService, useValue: toolOrchestrator },
        { provide: ToolRegistry, useValue: toolRegistry },
        { provide: PlannerService, useValue: planner },
        { provide: ProactiveSuggestionFacade, useValue: proactiveSuggestions },
        {
          provide: EvaluationRecorderService,
          useValue: evaluationRecorder,
        },
        { provide: SmallTalkService, useValue: smallTalk },
      ],
    }).compile();

    service = module.get(AssistantService);

    prisma.conversation.create.mockResolvedValue({
      id: 'conv-new',
      userId: 'user-1',
    });
    prisma.conversation.update.mockResolvedValue({});
    memoryService.getRecentMessages.mockResolvedValue([]);
    memoryService.saveMessage.mockResolvedValue({ id: 'msg-assistant-1' });
    proactiveSuggestions.build.mockResolvedValue([]);
    evaluationRecorder.recordFromTrace.mockClear();
    smallTalk.match.mockReturnValue(null);
    embeddingService.embed.mockResolvedValue([0.1, 0.2]);
    attachmentService.createMany.mockResolvedValue([]);
    toolOrchestrator.handle.mockResolvedValue({ handled: false });
    knowledgeOrchestrator.retrieve.mockResolvedValue({
      snippets: [
        {
          source: 'document_kb',
          title: 'doc.pdf',
          content: 'RAG context',
          score: 0.9,
          page: 1,
        },
      ],
      context:
        '### Indexed knowledge base\n\n--- Document: doc.pdf ---\nRAG context',
      bySource: {
        conversation_attachments: [],
        document_kb: [
          {
            source: 'document_kb',
            title: 'doc.pdf',
            content: 'RAG context',
            score: 0.9,
            page: 1,
          },
        ],
        documentation_kb: [],
        application_db: [],
      },
      providersUsed: [],
    });
    promptBuilderService.buildRagPrompt.mockReturnValue('PROMPT');
    llmService.ask.mockResolvedValue('Generated answer');
    llmService.askWithMeta.mockResolvedValue({
      text: 'Generated answer',
      modelName: 'gemini-test',
      latencyMs: 12,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a conversation when conversationId is omitted', async () => {
    const result = await service.chat('user-1', 'What is RAG?');

    expect(prisma.conversation.create).toHaveBeenCalled();
    expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    expect(result.conversationId).toBe('conv-new');
    expect(result.answer).toBe('Generated answer');
  });

  it('should continue an existing conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-existing',
      userId: 'user-1',
    });
    memoryService.getRecentMessages.mockResolvedValue([
      { role: 'user', content: 'What is RAG?' },
      { role: 'assistant', content: 'Retrieval Augmented Generation.' },
    ]);

    const result = await service.chat(
      'user-1',
      'Explain more',
      'conv-existing',
    );

    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(knowledgeOrchestrator.retrieve).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        conversationId: 'conv-existing',
        query: 'Explain more',
      }),
    );
    expect(result.conversationId).toBe('conv-existing');
  });

  it('should persist incoming attachments on the conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-1',
      userId: 'user-1',
    });

    await service.chat('user-1', 'Summarize this', 'conv-1', [
      { name: 'a.pdf', text: 'Attachment body' },
    ]);

    expect(attachmentService.createMany).toHaveBeenCalledWith(
      'conv-1',
      'user-1',
      [{ name: 'a.pdf', text: 'Attachment body' }],
    );
    expect(memoryService.saveMessage).toHaveBeenNthCalledWith(
      1,
      'conv-1',
      'user',
      'Summarize this\n\n[Attached: a.pdf]',
    );
  });

  it('should throw NotFoundException for missing conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(
      service.chat('user-1', 'Hello', 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should not call the LLM when knowledge context is empty', async () => {
    knowledgeOrchestrator.retrieve.mockResolvedValue({
      snippets: [],
      context: '',
      bySource: {
        conversation_attachments: [],
        document_kb: [],
        documentation_kb: [],
        application_db: [],
      },
      providersUsed: [],
    });

    const result = await service.chat('user-1', 'Unknown topic');

    expect(llmService.ask).not.toHaveBeenCalled();
    expect(result.answer).toBe(RAG_INSUFFICIENT_CONTEXT_MESSAGE);
    expect(result.sources).toEqual([]);
  });
});
