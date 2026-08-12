import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ErrorLogger } from '../../common/logger/error-logger';
import { SensitiveDataRedactor } from '../../common/security/sensitive-data-redactor';
import {
  sanitizeUntrusted,
  UNTRUSTED_MAX,
} from '../../common/security/untrusted-text';
import { PrismaService } from '../../prisma/prisma.service';

import { PlannerService } from '../actions/planner.service';
import type { ExecutionPlan } from '../actions/planner.types';
import { ToolOrchestratorService } from '../actions/tool-orchestrator.service';
import { ToolRegistry } from '../actions/tool.registry';
import type { ToolActionButton } from '../actions/tool.types';
import { ConversationAttachmentService } from '../conversation/conversation-attachment.service';
import { EmbeddingService } from '../documents/services/embedding.service';
import { IntentService } from '../intent/intent.service';
import { KnowledgeOrchestratorService } from '../knowledge/knowledge-orchestrator.service';
import { buildSourceAttributions } from '../knowledge/source-attribution';
import { deriveAnswerMode } from '../knowledge/answer-mode';
import { LanguageService } from '../language/language.service';
import { LlmService } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import { RequestContextStore } from '../integration/request-context';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';
import {
  buildExecutionTrace,
  createRequestId,
} from './execution-trace.builder';
import type { ExecutionTrace } from './execution-trace.types';
import { ProactiveSuggestionFacade } from './suggestions/proactive-suggestion.facade';
import { EvaluationRecorderService } from '../evaluation/evaluation-recorder.service';
import { SmallTalkService } from '../small-talk/small-talk.service';
import { BackgroundWorkflowService } from '../workflow/background-workflow.service';
import { WorkflowEngineService } from '../workflow/workflow.engine';
import type { WorkflowRunResult } from '../workflow/workflow.types';

const HISTORY_LIMIT = 10;

const BACKGROUND_PHRASE =
  /\b(in the background|run in background|asynchronously|async(?:hronously)?|background (?:please|now)?)\b/i;

export type ChatActionPayload = {
  toolId: string;
  actionId: string;
  payload?: Record<string, unknown>;
};

export type ChatConfirmPayload = {
  confirmationId: string;
  approved: boolean;
};

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly languageService: LanguageService,
    private readonly intentService: IntentService,
    private readonly memoryService: MemoryService,
    private readonly embeddingService: EmbeddingService,
    private readonly knowledgeOrchestrator: KnowledgeOrchestratorService,
    private readonly attachmentService: ConversationAttachmentService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly toolOrchestrator: ToolOrchestratorService,
    private readonly toolRegistry: ToolRegistry,
    private readonly planner: PlannerService,
    private readonly proactiveSuggestions: ProactiveSuggestionFacade,
    private readonly evaluationRecorder: EvaluationRecorderService,
    private readonly smallTalk: SmallTalkService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly backgroundWorkflows: BackgroundWorkflowService,
  ) {}

  async chat(
    userId: string,
    message: string,
    conversationId?: string,
    attachments?: Array<{ name: string; text: string }>,
    action?: ChatActionPayload,
    confirm?: ChatConfirmPayload,
    options?: {
      regenerate?: boolean;
      editMessageId?: string;
      /** User message id that owns assistant siblings (regenerate). */
      parentMessageId?: string;
      stream?: import('./chat-stream.types').ChatStreamOptions;
      executionMode?: 'interactive' | 'background';
    },
  ) {
    const requestId = createRequestId();
    const totalStart = performance.now();
    let activeConversationId: string | undefined = conversationId;
    let retrievalMs: number | undefined;
    let toolMs: number | undefined;
    let generationMs: number | undefined;
    let turnTree: import('../memory/memory.service').TurnTreeContext | null =
      null;

    const incomingAttachments = (attachments ?? [])
      .map((attachment) => ({
        name: sanitizeUntrusted(attachment.name.trim(), UNTRUSTED_MAX.title),
        text: sanitizeUntrusted(attachment.text.trim(), 80_000),
      }))
      .filter((attachment) => attachment.name && attachment.text);

    const question =
      message.trim() ||
      (incomingAttachments.length
        ? `Please review the attached file${incomingAttachments.length > 1 ? 's' : ''}: ${incomingAttachments.map((item) => item.name).join(', ')}.`
        : action
          ? `Action: ${action.actionId}`
          : confirm
            ? confirm.approved
              ? 'Confirm action'
              : 'Cancel action'
            : '');

    if (!question && !action && !confirm) {
      throw new BadRequestException(
        'Message, attachment, or action is required',
      );
    }

    try {
      const conversation = await this.resolveConversation(
        userId,
        question || 'Action',
        conversationId,
      );
      activeConversationId = conversation.id;

      if (incomingAttachments.length) {
        await this.attachmentService.createMany(
          conversation.id,
          userId,
          incomingAttachments,
        );
      }

      const historyLeafHint =
        options?.regenerate && options.parentMessageId
          ? options.parentMessageId
          : undefined;

      // Place the user turn in the conversation tree (edit forks / regenerate skips).
      // History is read from the path ending at the new/edited user message.
      const storedUserMessage = incomingAttachments.length
        ? `${question}\n\n[Attached: ${incomingAttachments.map((item) => item.name).join(', ')}]`
        : question;

      turnTree = await this.memoryService.beginTurn({
        conversationId: conversation.id,
        content: storedUserMessage,
        regenerate: options?.regenerate,
        editMessageId: options?.editMessageId,
        parentMessageId: options?.parentMessageId,
      });
      const activeTurn = turnTree;

      const historyRaw = await this.memoryService.getRecentMessages(
        conversation.id,
        HISTORY_LIMIT,
        historyLeafHint ?? activeTurn.userMessageId,
      );
      // Current user turn is passed as `question` separately — keep history prior-only.
      const history = historyRaw.filter(
        (item) => item.id !== activeTurn.userMessageId,
      );

      const preferredLocale =
        RequestContextStore.getApplicationContext()?.locale ?? null;
      const language = await this.languageService.detectLanguage(
        question || '',
        preferredLocale,
      );
      const intent = this.intentService.detectIntent(question || 'action');

      options?.stream?.onStatus?.('started', conversation.id);

      const uiAction = Boolean(action || confirm);
      let plan: ExecutionPlan | null = null;

      if (!uiAction) {
        plan = this.planner.plan({
          message: question,
          availableToolIds: this.toolRegistry.tools.map((tool) => tool.id),
        });
      }

      // ——— Resume paused workflow on confirmation (before Action Engine) ———
      if (confirm?.confirmationId) {
        const waitingJob =
          await this.backgroundWorkflows.findWaitingByConfirmation(
            confirm.confirmationId,
            userId,
          );
        if (waitingJob) {
          const resumed = await this.backgroundWorkflows.resumeConfirmation({
            jobId: waitingJob.id,
            userId,
            confirmationId: confirm.confirmationId,
            approved: confirm.approved,
            message: question,
          });
          if (resumed?.result.handled) {
            const finished = await this.finishWorkflowTurn({
              userId,
              conversationId: conversation.id,
              question,
              language,
              intent,
              requestId,
              totalStart,
              turnTree: turnTree,
              stream: options?.stream,
              result: resumed.result,
              jobMeta: {
                jobId: resumed.job.id,
                executionMode: 'background',
                queueTime: resumed.job.queueTimeMs ?? undefined,
                resumeCount: resumed.job.resumeCount,
              },
            });
            await this.backgroundWorkflows.attachResultMessage({
              jobId: resumed.job.id,
              userId,
              messageId: finished.messageId,
              executionTraceId: requestId,
              answer: resumed.result.answer,
            });
            return finished;
          }
        }

        const paused = this.workflowEngine.getPaused(
          confirm.confirmationId,
          userId,
        );
        if (paused) {
          const workflowResult = await this.workflowEngine.resume({
            userId,
            conversationId: conversation.id,
            confirmationId: confirm.confirmationId,
            approved: confirm.approved,
            message: question,
          });
          if (workflowResult?.handled) {
            return this.finishWorkflowTurn({
              userId,
              conversationId: conversation.id,
              question,
              language,
              intent,
              requestId,
              totalStart,
              turnTree: turnTree,
              stream: options?.stream,
              result: workflowResult,
              jobMeta: { executionMode: 'interactive' },
            });
          }
        }
      }

      // ——— Retry background workflow via action button ———
      if (
        action?.toolId === 'workflow_job' &&
        action.actionId === 'retry_workflow_job'
      ) {
        const jobId =
          typeof action.payload?.jobId === 'string'
            ? action.payload.jobId
            : null;
        if (jobId) {
          const job = await this.backgroundWorkflows.retry(jobId, userId);
          const answer = `Retrying “${job.workflowName ?? job.workflowId}” in the background. I’ll update this conversation when it finishes.`;
          this.emitInstantStreamAnswer(options?.stream, answer);
          const executionTrace = buildExecutionTrace({
            requestId,
            uiAction: true,
            usedRag: false,
            timing: {
              totalMs: Math.round(performance.now() - totalStart),
            },
            jobId: job.id,
            executionMode: 'background',
            resumeCount: job.resumeCount,
          });
          return this.finishTurn({
            userId,
            conversationId: conversation.id,
            question,
            language,
            intent,
            answer,
            sources: [],
            executionTrace,
            turnTree: turnTree,
            skipSuggestions: true,
          });
        }
      }

      // ——— Small talk (no RAG / tools / LLM answer) ———
      if (
        !uiAction &&
        !incomingAttachments.length &&
        plan?.mode === 'small_talk'
      ) {
        const preferredLanguage =
          SmallTalkService.fromLanguageLabel(language) ??
          inferPreferredFromHistory(history);

        const smallTalkMatch = this.smallTalk.match(question, {
          conversationId: conversation.id,
          preferredLanguage,
        });
        const answer =
          smallTalkMatch?.answer ?? 'Hello! How can I help you today?';

        this.emitInstantStreamAnswer(options?.stream, answer);

        const executionTrace = buildExecutionTrace({
          requestId,
          plan,
          usedRag: false,
          smallTalkIntent: smallTalkMatch?.intent,
          timing: {
            totalMs: Math.round(performance.now() - totalStart),
          },
        });

        return this.finishTurn({
          userId,
          conversationId: conversation.id,
          question,
          language,
          intent,
          answer,
          sources: [],
          executionTrace,
          turnTree: turnTree,
        });
      }

      // ——— Workflow Engine (trigger phrases; Planner untouched) ———
      if (!uiAction && !incomingAttachments.length) {
        const matched = this.workflowEngine.match(question);
        if (matched) {
          const wantsBackground =
            options?.executionMode === 'background' ||
            BACKGROUND_PHRASE.test(question);

          if (wantsBackground) {
            const job = await this.backgroundWorkflows.enqueue({
              userId,
              conversationId: conversation.id,
              message: question,
              workflowId: matched.id,
              workflowName: matched.name,
              progress: matched.steps.map((step) => ({
                id: step.id,
                name: step.name,
                status: 'pending' as const,
              })),
            });

            const answer = `Started “${matched.name}” in the background (job ${job.id.slice(0, 8)}…). You can leave this chat — I’ll append the result here when it finishes.`;
            this.emitInstantStreamAnswer(options?.stream, answer);

            const executionTrace = buildExecutionTrace({
              requestId,
              usedRag: false,
              timing: {
                totalMs: Math.round(performance.now() - totalStart),
              },
              workflow: {
                id: matched.id,
                name: matched.name,
                durationMs: 0,
                status: 'paused',
                completedSteps: [],
                failedSteps: [],
                skippedSteps: [],
                progress: matched.steps.map((step) => ({
                  id: step.id,
                  name: step.name,
                  status: 'pending' as const,
                })),
              },
              jobId: job.id,
              executionMode: 'background',
              resumeCount: job.resumeCount,
            });

            return this.finishTurn({
              userId,
              conversationId: conversation.id,
              question,
              language,
              intent,
              answer,
              sources: [],
              executionTrace,
              turnTree: turnTree,
              skipSuggestions: true,
            });
          }

          const workflowResult = await this.workflowEngine.start({
            userId,
            conversationId: conversation.id,
            message: question,
          });
          if (workflowResult?.handled) {
            return this.finishWorkflowTurn({
              userId,
              conversationId: conversation.id,
              question,
              language,
              intent,
              requestId,
              totalStart,
              turnTree: turnTree,
              stream: options?.stream,
              result: workflowResult,
              jobMeta: { executionMode: 'interactive' },
            });
          }
        }
      }

      // ——— Explicit UI action / confirmation (Action Engine) ———
      if (uiAction) {
        const toolStart = performance.now();
        const toolResult = await this.toolOrchestrator.handle({
          userId,
          conversationId: conversation.id,
          message: question,
          action,
          confirm,
        });
        toolMs = Math.round(performance.now() - toolStart);

        if (toolResult.handled) {
          const answer = toolResult.message ?? 'Done.';
          this.emitInstantStreamAnswer(options?.stream, answer);
          const actions = serializeActions(toolResult);
          const executionTrace = buildExecutionTrace({
            requestId,
            uiAction: true,
            toolResult,
            confirmationCompleted: Boolean(confirm?.approved),
            usedRag: false,
            timing: {
              totalMs: Math.round(performance.now() - totalStart),
              toolMs,
            },
          });

          return this.finishTurn({
            userId,
            conversationId: conversation.id,
            question,
            language,
            intent,
            answer,
            sources: [],
            actions,
            confirmationId: toolResult.confirmationId,
            executionTrace,
            actionMeta: {
              toolId: toolResult.toolId,
              status: toolResult.status,
              durationMs: toolResult.durationMs,
            },
            turnTree: turnTree,
          });
        }
      }

      // ——— Planner-driven tools (no RAG when plan says tool / multi_step) ———
      if (
        plan &&
        !plan.includeRag &&
        plan.steps.length > 0 &&
        (plan.mode === 'tool' || plan.mode === 'multi_step')
      ) {
        const toolStart = performance.now();
        const toolResult = await this.toolOrchestrator.handle({
          userId,
          conversationId: conversation.id,
          message: question,
          plannedTools: plan.steps.map((step) => ({
            toolId: step.toolId,
            reason: step.reason,
            payload: step.payload,
          })),
        });
        toolMs = Math.round(performance.now() - toolStart);

        if (toolResult.handled) {
          const answer = toolResult.message ?? 'Done.';
          this.emitInstantStreamAnswer(options?.stream, answer);
          const actions = serializeActions(toolResult);
          const executionTrace = buildExecutionTrace({
            requestId,
            plan,
            toolResult,
            usedRag: false,
            timing: {
              totalMs: Math.round(performance.now() - totalStart),
              toolMs,
            },
          });

          return this.finishTurn({
            userId,
            conversationId: conversation.id,
            question,
            language,
            intent,
            answer,
            sources: [],
            actions,
            confirmationId: toolResult.confirmationId,
            executionTrace,
            actionMeta: {
              toolId: toolResult.toolId,
              status: toolResult.status,
              durationMs: toolResult.durationMs,
            },
            turnTree: turnTree,
          });
        }
      }

      // ——— Existing RAG pipeline (unchanged steps) ———
      let queryEmbedding: number[];
      try {
        const embedStart = performance.now();
        queryEmbedding = await this.embeddingService.embed(question);
        ErrorLogger.logDuration(
          'AssistantService.chat.embed',
          performance.now() - embedStart,
          { userId, conversationId: activeConversationId },
        );
      } catch (error) {
        ErrorLogger.log(error, 'AssistantService.chat.embed', {
          userId,
          conversationId: activeConversationId,
        });
        throw error;
      }

      let knowledge: Awaited<
        ReturnType<KnowledgeOrchestratorService['retrieve']>
      >;
      try {
        const retrievalStart = performance.now();
        knowledge = await this.knowledgeOrchestrator.retrieve({
          userId,
          conversationId: conversation.id,
          query: question,
          queryEmbedding,
          topK: 10,
        });
        retrievalMs = Math.round(performance.now() - retrievalStart);
        ErrorLogger.logDuration(
          'AssistantService.chat.retrieval',
          retrievalMs,
          {
            userId,
            conversationId: activeConversationId,
            snippetCount: knowledge.snippets.length,
          },
        );
      } catch (error) {
        ErrorLogger.log(error, 'AssistantService.chat.retrieval', {
          userId,
          conversationId: activeConversationId,
        });
        throw error;
      }

      if (!knowledge.context.trim()) {
        // Hybrid: still try planned tools when RAG has nothing.
        if (plan?.steps.length) {
          const toolStart = performance.now();
          const toolResult = await this.toolOrchestrator.handle({
            userId,
            conversationId: conversation.id,
            message: question,
            plannedTools: plan.steps.map((step) => ({
              toolId: step.toolId,
              reason: step.reason,
              payload: step.payload,
            })),
          });
          toolMs = Math.round(performance.now() - toolStart);

          if (toolResult.handled) {
            const answer = toolResult.message ?? 'Done.';
            this.emitInstantStreamAnswer(options?.stream, answer);
            const actions = serializeActions(toolResult);
            const executionTrace = buildExecutionTrace({
              requestId,
              plan,
              toolResult,
              snippets: knowledge.snippets,
              routeIntent: knowledge.routeIntent,
              usedRag: false,
              timing: {
                totalMs: Math.round(performance.now() - totalStart),
                retrievalMs,
                toolMs,
              },
            });

            return this.finishTurn({
              userId,
              conversationId: conversation.id,
              question,
              language,
              intent,
              answer,
              sources: [],
              actions,
              confirmationId: toolResult.confirmationId,
              executionTrace,
              actionMeta: {
                toolId: toolResult.toolId,
                status: toolResult.status,
                durationMs: toolResult.durationMs,
              },
              turnTree: turnTree,
            });
          }
        }

        const answer = this.languageService.insufficientContextMessage(language);
        this.emitInstantStreamAnswer(options?.stream, answer);
        const executionTrace = buildExecutionTrace({
          requestId,
          plan,
          snippets: knowledge.snippets,
          routeIntent: knowledge.routeIntent,
          usedRag: true,
          timing: {
            totalMs: Math.round(performance.now() - totalStart),
            retrievalMs,
          },
        });

        return this.finishTurn({
          userId,
          conversationId: conversation.id,
          question,
          language,
          intent,
          answer,
          sources: [],
          executionTrace,
          turnTree: turnTree,
        });
      }

      const prompt = this.promptBuilderService.buildRagPrompt({
        history,
        context: knowledge.context,
        question,
        language,
        insufficientContextMessage:
          this.languageService.insufficientContextMessage(language),
        routeIntent: knowledge.routeIntent,
      });

      let llmMeta: {
        text: string;
        modelName: string;
        latencyMs: number;
        inputTokens?: number;
        outputTokens?: number;
        interrupted?: boolean;
      };
      try {
        const llmStart = performance.now();
        options?.stream?.onStatus?.('generating', conversation.id);
        if (options?.stream?.onToken) {
          llmMeta = await this.llmService.streamWithMeta(prompt, {
            signal: options.stream.signal,
            onToken: options.stream.onToken,
          });
        } else {
          llmMeta = await this.llmService.askWithMeta(prompt);
        }
        generationMs = Math.round(performance.now() - llmStart);
        ErrorLogger.logDuration('AssistantService.chat.llm', generationMs, {
          userId,
          conversationId: activeConversationId,
        });
      } catch (error) {
        ErrorLogger.log(error, 'AssistantService.chat.llm', {
          userId,
          conversationId: activeConversationId,
        });
        throw error;
      }

      let answer = llmMeta.text;
      const interrupted = Boolean(llmMeta.interrupted);
      const sources = buildSourceAttributions(
        knowledge.snippets,
        knowledge.providersUsed,
      );
      const businessVisual = extractBusinessVisual(knowledge.snippets);

      let toolResult:
        Awaited<ReturnType<ToolOrchestratorService['handle']>> | undefined;
      let actions: ReturnType<typeof serializeActions> | undefined;

      // Hybrid: RAG answer + planned tools (proposal / execution).
      // Skip tool chaining when the user interrupted generation.
      // Tool text is appended after streaming completes (not streamed as tokens).
      if (!interrupted && plan?.includeRag && plan.steps.length > 0) {
        const toolStart = performance.now();
        toolResult = await this.toolOrchestrator.handle({
          userId,
          conversationId: conversation.id,
          message: question,
          plannedTools: plan.steps.map((step) => ({
            toolId: step.toolId,
            reason: step.reason,
            payload: step.payload,
          })),
        });
        toolMs = Math.round(performance.now() - toolStart);

        if (toolResult.handled && toolResult.message?.trim()) {
          answer = `${answer}\n\n${toolResult.message.trim()}`;
          actions = serializeActions(toolResult);
        }
      }

      options?.stream?.onStatus?.('finalizing', conversation.id);

      const executionTrace = buildExecutionTrace({
        requestId,
        plan,
        snippets: knowledge.snippets,
        routeIntent: knowledge.routeIntent,
        toolResult,
        usedRag: true,
        llm: {
          modelName: llmMeta.modelName,
          latencyMs: llmMeta.latencyMs,
          inputTokens: llmMeta.inputTokens,
          outputTokens: llmMeta.outputTokens,
        },
        timing: {
          totalMs: Math.round(performance.now() - totalStart),
          retrievalMs,
          toolMs,
          generationMs,
        },
      });

      const finished = await this.finishTurn({
        userId,
        conversationId: conversation.id,
        question,
        language,
        intent,
        answer,
        sources,
        businessVisual,
        actions,
        confirmationId: toolResult?.confirmationId,
        executionTrace,
        actionMeta: toolResult?.handled
          ? {
              toolId: toolResult.toolId,
              status: toolResult.status,
              durationMs: toolResult.durationMs,
            }
          : undefined,
        skipSuggestions: interrupted,
        turnTree: turnTree,
      });

      return {
        ...finished,
        interrupted,
      };
    } catch (error) {
      ErrorLogger.log(error, 'AssistantService.chat', {
        userId,
        conversationId: activeConversationId,
        question: message,
        requestId,
      });
      throw error;
    }
  }

  /** Emit a one-shot answer chunk for non-LLM paths (small talk / tools). */
  private emitInstantStreamAnswer(
    stream: import('./chat-stream.types').ChatStreamOptions | undefined,
    answer: string,
  ) {
    if (!stream?.onToken || !answer) return;
    stream.onStatus?.('generating');
    stream.onToken(answer);
  }

  private async finishWorkflowTurn(input: {
    userId: string;
    conversationId: string;
    question: string;
    language: string;
    intent: unknown;
    requestId: string;
    totalStart: number;
    turnTree: import('../memory/memory.service').TurnTreeContext;
    stream?: import('./chat-stream.types').ChatStreamOptions;
    result: WorkflowRunResult;
    jobMeta?: {
      jobId?: string;
      executionMode?: ExecutionTrace['executionMode'];
      queueTime?: number;
      resumeCount?: number;
    };
  }) {
    this.emitInstantStreamAnswer(input.stream, input.result.answer);

    const executionTrace = buildExecutionTrace({
      requestId: input.requestId,
      usedRag: false,
      llm: input.result.llm,
      workflow: input.result.workflow,
      timing: {
        totalMs: Math.round(performance.now() - input.totalStart),
        toolMs: input.result.toolMs,
        generationMs: input.result.generationMs,
      },
      jobId: input.jobMeta?.jobId,
      executionMode: input.jobMeta?.executionMode ?? 'interactive',
      queueTime: input.jobMeta?.queueTime,
      resumeCount: input.jobMeta?.resumeCount,
    });

    const actions =
      input.result.actions?.length || input.result.confirmationId
        ? {
            status: input.result.paused
              ? 'confirmation_required'
              : input.result.cancelled
                ? 'cancelled'
                : 'executed',
            toolId: 'workflow',
            confirmationId: input.result.confirmationId,
            buttons: input.result.actions ?? [],
          }
        : undefined;

    return this.finishTurn({
      userId: input.userId,
      conversationId: input.conversationId,
      question: input.question,
      language: input.language,
      intent: input.intent,
      answer: input.result.answer,
      sources: [],
      actions,
      confirmationId: input.result.confirmationId,
      executionTrace,
      turnTree: input.turnTree,
    });
  }

  /**
   * Persist assistant turn + proactive suggestions (no extra LLM call).
   */
  private async finishTurn(input: {
    userId: string;
    conversationId: string;
    question: string;
    language: string;
    intent: unknown;
    answer: string;
    sources: ReturnType<typeof buildSourceAttributions> | [];
    /** Additive BQE visual payload for the chat UI. */
    businessVisual?: unknown;
    actions?: ReturnType<typeof serializeActions>;
    confirmationId?: string;
    executionTrace: ExecutionTrace;
    actionMeta?: {
      toolId?: string;
      status?: string;
      durationMs?: number;
    };
    skipSuggestions?: boolean;
    turnTree: import('../memory/memory.service').TurnTreeContext;
  }) {
    const safeAnswer = SensitiveDataRedactor.redact(input.answer);
    const isSmallTalk = input.executionTrace.planner.mode === 'small_talk';

    // Small talk / interrupted streams stay lightweight — no suggestion chips.
    const suggestedActions =
      isSmallTalk || input.skipSuggestions
        ? []
        : await this.proactiveSuggestions.build({
            conversationId: input.conversationId,
            question: input.question,
            answer: safeAnswer,
            executionTrace: input.executionTrace,
            sources: Array.isArray(input.sources) ? input.sources : [],
          });

    const saved = await this.memoryService.saveMessage(
      input.conversationId,
      'assistant',
      safeAnswer,
      Array.isArray(input.sources) && input.sources.length
        ? input.sources
        : undefined,
      input.actions,
      input.executionTrace,
      suggestedActions.length ? suggestedActions : undefined,
      {
        parentMessageId: input.turnTree.assistantParentId,
        branchId: input.turnTree.branchId,
        version: input.turnTree.assistantVersion,
      },
    );

    await this.memoryService.setActivePath(
      input.conversationId,
      input.turnTree.activeBranchId,
      saved.id,
    );

    this.evaluationRecorder.recordFromTrace({
      userId: input.userId,
      conversationId: input.conversationId,
      messageId: saved.id,
      answer: safeAnswer,
      sourceCount: Array.isArray(input.sources) ? input.sources.length : 0,
      suggestionCount: suggestedActions.length,
      executionTrace: input.executionTrace,
    });

    return {
      success: true,
      conversationId: input.conversationId,
      messageId: saved.id,
      userMessageId: input.turnTree.userMessageId ?? undefined,
      parentMessageId: input.turnTree.assistantParentId,
      branchId: input.turnTree.branchId,
      version: input.turnTree.assistantVersion,
      activeBranchId: input.turnTree.activeBranchId,
      activeLeafId: saved.id,
      pipeline: {
        language: input.language,
        intent: input.intent,
        ...(input.actionMeta ? { action: input.actionMeta } : {}),
        planner: {
          mode: input.executionTrace.planner.mode,
          confidence: input.executionTrace.planner.confidence,
        },
        routeIntent: input.executionTrace.knowledge?.routeIntent,
      },
      answer: safeAnswer,
      sources: input.sources,
      answerMode: deriveAnswerMode(
        Array.isArray(input.sources) ? input.sources : [],
      ),
      ...(input.businessVisual
        ? { businessVisual: input.businessVisual }
        : {}),
      actions: input.actions?.buttons ?? [],
      confirmationId: input.confirmationId,
      executionTrace: input.executionTrace,
      suggestedActions: suggestedActions,
    };
  }

  private async resolveConversation(
    userId: string,
    message: string,
    conversationId?: string,
  ) {
    if (!conversationId) {
      return this.prisma.conversation.create({
        data: {
          title: message.substring(0, 40),
          userId,
        },
      });
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Conversation "${conversationId}" was not found`,
      );
    }

    return existing;
  }
}

function serializeActions(toolResult: {
  status?: string;
  toolId?: string;
  confirmationId?: string;
  actions?: ToolActionButton[];
}) {
  if (
    !toolResult.actions?.length &&
    !toolResult.confirmationId &&
    !toolResult.status
  ) {
    return undefined;
  }

  return {
    status: toolResult.status,
    toolId: toolResult.toolId,
    confirmationId: toolResult.confirmationId,
    buttons: toolResult.actions ?? [],
  };
}

/** Pull first BQE visual payload from application snippets (additive). */
function extractBusinessVisual(
  snippets: Array<{ businessVisual?: unknown }>,
): unknown | undefined {
  for (const snippet of snippets) {
    if (snippet.businessVisual) return snippet.businessVisual;
  }
  return undefined;
}

function inferPreferredFromHistory(
  history: Array<{ role: string; content: string }>,
): import('../small-talk/small-talk.types').SmallTalkLanguage | undefined {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i];
    if (row.role !== 'user') continue;
    const text = row.content.trim().toLowerCase();
    if (
      /\b(merci|bonjour|salut|bonsoir|au revoir|comment ca va|ça va|aide)\b/.test(
        text,
      ) ||
      /[àâäéèêëïîôùûüç]/i.test(row.content)
    ) {
      return 'fr';
    }
    if (
      /\b(hola|gracias|adios|buenos|buenas|como estas|hasta luego)\b/.test(text)
    ) {
      return 'es';
    }
    if (/\b(hello|hi|thanks|thank you|bye|goodbye|how are you)\b/.test(text)) {
      return 'en';
    }
  }
  return undefined;
}
