import {
  buildDecisionSummary,
  buildExecutionTrace,
  buildKnowledgeSummary,
  createRequestId,
} from './execution-trace.builder';
import type { KnowledgeSnippet } from '../knowledge/knowledge.types';

describe('execution-trace.builder', () => {
  it('creates a safe trace without retrieved text', () => {
    const snippets: KnowledgeSnippet[] = [
      {
        source: 'document_kb',
        title: 'handbook.pdf',
        content: 'SECRET_CHUNK_SHOULD_NOT_APPEAR',
        page: 2,
      },
      {
        source: 'application_db',
        title: 'application:course',
        content: 'Courses: secret rows',
        providerId: 'course',
      },
    ];

    const trace = buildExecutionTrace({
      requestId: createRequestId(),
      plan: {
        mode: 'hybrid',
        reason: 'User asked about a course and requested enrollment.',
        confidence: 0.82,
        steps: [
          {
            toolId: 'enrollment',
            reason: 'User explicitly requested enrollment.',
          },
        ],
        includeRag: true,
      },
      snippets,
      toolResult: {
        handled: true,
        status: 'proposal',
        toolId: 'enrollment',
        durationMs: 40,
        toolsUsed: ['enrollment'],
        message: 'I found the course.',
      },
      usedRag: true,
      llm: {
        modelName: 'gemini-test',
        latencyMs: 120,
        inputTokens: 200,
        outputTokens: 80,
      },
      timing: {
        totalMs: 260,
        retrievalMs: 55,
        toolMs: 40,
        generationMs: 120,
      },
    });

    expect(trace.planner.mode).toBe('hybrid');
    expect(trace.knowledge.documentKb).toBe(1);
    expect(trace.knowledge.applicationDbProviders).toEqual(['course']);
    expect(trace.toolExecution[0]?.toolId).toBe('enrollment');
    expect(trace.toolExecution[0]?.confirmationRequired).toBe(true);
    expect(JSON.stringify(trace)).not.toContain('SECRET');
    expect(trace.decisionSummary.length).toBeGreaterThan(10);
  });

  it('summarizes knowledge counts only', () => {
    expect(
      buildKnowledgeSummary([
        {
          source: 'conversation_attachments',
          title: 'a.pdf',
          content: 'x',
        },
        {
          source: 'conversation_attachments',
          title: 'a.pdf',
          content: 'y',
        },
      ]),
    ).toEqual({
      conversationAttachments: 1,
      documentKb: 0,
      documentationKb: 0,
      applicationDbProviders: [],
    });
  });

  it('explains rag-only decisions', () => {
    expect(
      buildDecisionSummary({
        plan: {
          mode: 'rag',
          reason: 'info',
          confidence: 0.9,
          steps: [],
          includeRag: true,
        },
        usedRag: true,
      }),
    ).toMatch(/knowledge retrieval only/i);
  });
});
