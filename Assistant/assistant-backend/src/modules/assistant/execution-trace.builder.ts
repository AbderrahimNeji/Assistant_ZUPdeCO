import { randomUUID } from 'crypto';

import type { ExecutionPlan } from '../actions/planner.types';
import type { ToolOrchestratorResult } from '../actions/tool.types';
import type { KnowledgeSnippet } from '../knowledge/knowledge.types';
import type { ExecutionTrace } from './execution-trace.types';

const isDev = () => process.env.NODE_ENV !== 'production';
const inspectorVerbose = () =>
  isDev() || process.env.EXECUTION_INSPECTOR === '1';

export function createRequestId(): string {
  return randomUUID();
}

export function buildKnowledgeSummary(
  snippets: KnowledgeSnippet[],
  routeIntent?: string,
): {
  conversationAttachments: number;
  documentKb: number;
  documentationKb: number;
  applicationDbProviders: string[];
  routeIntent?: string;
  business?: ExecutionTrace['knowledge']['business'];
} {
  const attachmentTitles = new Set<string>();
  const documentTitles = new Set<string>();
  const documentationTitles = new Set<string>();
  const providers = new Set<string>();
  let business: ExecutionTrace['knowledge']['business'];

  for (const snippet of snippets) {
    if (snippet.source === 'conversation_attachments') {
      attachmentTitles.add(snippet.title);
    } else if (snippet.source === 'document_kb') {
      documentTitles.add(snippet.title);
    } else if (snippet.source === 'documentation_kb') {
      documentationTitles.add(
        snippet.documentName || snippet.title || 'documentation',
      );
    } else if (snippet.source === 'application_db') {
      const provider =
        snippet.providerId ||
        /^application:(.+)$/.exec(snippet.title)?.[1] ||
        'application';
      providers.add(provider);

      if (!business && snippet.businessTransparency) {
        const t = snippet.businessTransparency as Record<string, unknown>;
        business = {
          questionCategory:
            typeof t.questionCategory === 'string'
              ? t.questionCategory
              : undefined,
          skillsExecuted: Array.isArray(t.skillsExecuted)
            ? (t.skillsExecuted as string[])
            : undefined,
          skillsSucceeded: Array.isArray(t.skillsSucceeded)
            ? (t.skillsSucceeded as string[])
            : undefined,
          skillsFailed: Array.isArray(t.skillsFailed)
            ? (t.skillsFailed as string[])
            : undefined,
          modulesQueried: Array.isArray(t.modulesQueried)
            ? (t.modulesQueried as string[])
            : undefined,
          confidence:
            typeof t.confidence === 'number' ? t.confidence : undefined,
          freshness: typeof t.freshness === 'string' ? t.freshness : undefined,
          partial: typeof t.partial === 'boolean' ? t.partial : undefined,
          dataSource:
            typeof t.dataSource === 'string' ? t.dataSource : undefined,
        };
      }
    }
  }

  return {
    conversationAttachments: attachmentTitles.size,
    documentKb: documentTitles.size,
    documentationKb: documentationTitles.size,
    applicationDbProviders: [...providers],
    ...(routeIntent ? { routeIntent } : {}),
    ...(business ? { business } : {}),
  };
}

export function buildToolExecutionEntries(
  toolResult: ToolOrchestratorResult | undefined,
  options?: {
    confirmationCompleted?: boolean;
    fromUiAction?: boolean;
  },
): ExecutionTrace['toolExecution'] {
  if (!toolResult?.handled) return [];

  const ids = toolResult.toolsUsed?.length
    ? toolResult.toolsUsed
    : toolResult.toolId
      ? [toolResult.toolId]
      : [];

  const confirmationRequired =
    toolResult.status === 'confirmation_required' ||
    toolResult.status === 'proposal';

  const success =
    toolResult.status === 'executed' ||
    toolResult.status === 'proposal' ||
    toolResult.status === 'confirmation_required' ||
    toolResult.status === 'cancelled';

  return ids.map((toolId, index) => ({
    toolId,
    durationMs: index === ids.length - 1 ? toolResult.durationMs : undefined,
    success,
    confirmationRequired:
      index === ids.length - 1 ? confirmationRequired : false,
    confirmationCompleted: Boolean(options?.confirmationCompleted),
    status: toolResult.status,
  }));
}

export function buildDecisionSummary(input: {
  plan?: ExecutionPlan | null;
  toolResult?: ToolOrchestratorResult;
  usedRag: boolean;
  uiAction?: boolean;
  smallTalkIntent?: string;
}): string {
  if (input.uiAction) {
    if (input.toolResult?.status === 'cancelled') {
      return 'The user cancelled a pending action.';
    }
    if (input.toolResult?.status === 'confirmation_required') {
      return 'A destructive action was proposed and is waiting for confirmation.';
    }
    if (input.toolResult?.status === 'proposal') {
      return 'An action was proposed; the user can confirm with a button.';
    }
    if (input.toolResult?.handled) {
      return 'An explicit UI action was executed through the Action Engine.';
    }
    return 'An explicit UI action was requested but could not be completed.';
  }

  if (input.plan?.mode === 'small_talk') {
    const intent = input.smallTalkIntent ?? 'conversation';
    return `Small talk (${intent}) — replied conversationally without retrieval or tools.`;
  }

  if (
    input.plan?.mode === 'rag' ||
    (!input.toolResult?.handled && input.usedRag)
  ) {
    return 'The planner chose knowledge retrieval only — no application action was taken.';
  }

  if (
    input.plan?.mode === 'hybrid' &&
    input.usedRag &&
    input.toolResult?.handled
  ) {
    return 'The planner combined knowledge retrieval with an application action proposal or execution.';
  }

  if (input.toolResult?.status === 'confirmation_required') {
    return 'An action requires confirmation before it can run.';
  }

  if (input.toolResult?.status === 'proposal') {
    return 'An action was suggested; it was not executed until the user confirms.';
  }

  if (input.toolResult?.handled) {
    return `The planner selected tool mode (${input.plan?.mode ?? 'tool'}) and the Action Engine handled the request.`;
  }

  return 'No application action ran; the assistant answered from retrieved knowledge when available.';
}

export function buildExecutionTrace(input: {
  requestId: string;
  plan?: ExecutionPlan | null;
  uiAction?: boolean;
  snippets?: KnowledgeSnippet[];
  routeIntent?: string;
  toolResult?: ToolOrchestratorResult;
  confirmationCompleted?: boolean;
  llm?: ExecutionTrace['llm'];
  timing: ExecutionTrace['timing'];
  usedRag: boolean;
  smallTalkIntent?: ExecutionTrace['planner']['intent'];
  workflow?: ExecutionTrace['workflow'];
  jobId?: string;
  executionMode?: ExecutionTrace['executionMode'];
  queueTime?: number;
  resumeCount?: number;
}): ExecutionTrace {
  const plan = input.plan;
  const knowledge = buildKnowledgeSummary(
    input.snippets ?? [],
    input.routeIntent,
  );

  const planner: ExecutionTrace['planner'] = input.uiAction
    ? {
        mode: 'ui_action',
        confidence: 1,
        reasoningSummary:
          'User triggered an explicit action or confirmation control.',
        selectedTools: input.toolResult?.toolId
          ? [
              {
                id: input.toolResult.toolId,
                reason: 'Selected by UI action payload.',
              },
            ]
          : [],
      }
    : input.workflow
      ? {
          mode: plan?.mode ?? 'multi_step',
          confidence: 1,
          reasoningSummary: `Workflow “${input.workflow.name}” (${input.workflow.id}).`,
          selectedTools: input.workflow.progress
            .filter((step) => step.status === 'completed')
            .slice(0, 8)
            .map((step) => ({
              id: step.id,
              reason: step.name,
            })),
        }
      : {
          mode: plan?.mode ?? 'rag',
          confidence: plan?.confidence ?? 0.5,
          reasoningSummary: plan?.reason ?? 'No planner decision recorded.',
          selectedTools: (plan?.steps ?? []).map((step) => ({
            id: step.toolId,
            reason: step.reason,
            requiresConfirmation: step.requiresConfirmation,
          })),
          ...(plan?.mode === 'small_talk' && input.smallTalkIntent
            ? { intent: input.smallTalkIntent }
            : {}),
        };

  if (inspectorVerbose() && plan) {
    planner.executionPlan = {
      includeRag: plan.includeRag,
      steps: plan.steps.map((step) => ({
        toolId: step.toolId,
        reason: step.reason,
      })),
    };
  }

  const decisionSummary = input.workflow
    ? `Workflow “${input.workflow.name}” ${input.workflow.status} — ${input.workflow.completedSteps.length} step(s) completed.`
    : buildDecisionSummary({
        plan,
        toolResult: input.toolResult,
        usedRag: input.usedRag,
        uiAction: input.uiAction,
        smallTalkIntent: input.smallTalkIntent,
      });

  const trace: ExecutionTrace = {
    requestId: input.requestId,
    planner,
    knowledge,
    toolExecution: buildToolExecutionEntries(input.toolResult, {
      confirmationCompleted: input.confirmationCompleted,
      fromUiAction: input.uiAction,
    }),
    llm: input.llm,
    timing: input.timing,
    decisionSummary,
    ...(input.workflow ? { workflow: input.workflow } : {}),
    ...(input.jobId ? { jobId: input.jobId } : {}),
    ...(input.executionMode ? { executionMode: input.executionMode } : {}),
    ...(typeof input.queueTime === 'number'
      ? { queueTime: input.queueTime }
      : {}),
    ...(typeof input.resumeCount === 'number'
      ? { resumeCount: input.resumeCount }
      : {}),
  };

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[ExecutionTrace]', {
      requestId: trace.requestId,
      planner: {
        mode: trace.planner.mode,
        confidence: trace.planner.confidence,
        tools: trace.planner.selectedTools.map((tool) => tool.id),
      },
      knowledge: trace.knowledge,
      toolChain: trace.toolExecution.map((item) => item.toolId),
      timing: trace.timing,
      decision: trace.decisionSummary,
      ...(trace.jobId ? { jobId: trace.jobId } : {}),
      ...(trace.executionMode ? { executionMode: trace.executionMode } : {}),
    });
  }

  return trace;
}
