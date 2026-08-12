import { Injectable, Logger } from '@nestjs/common';

import { SmallTalkService } from '../small-talk/small-talk.service';
import {
  ExecutionPlan,
  PLANNER_CONFIDENCE_THRESHOLD,
  PlanMode,
  PlannerInput,
  PlanStep,
} from './planner.types';

type ToolSignal = {
  toolId: string;
  score: number;
  reason: string;
  requiresConfirmation?: boolean;
  isMutating?: boolean;
};

/**
 * Intent → execution plan.
 * Suggests tools only; ToolOrchestrator validation/confirmation stay authoritative.
 */
@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(private readonly smallTalk: SmallTalkService) {}

  plan(input: PlannerInput): ExecutionPlan {
    const started = performance.now();
    const message = input.message.trim();
    const available = new Set(input.availableToolIds);

    if (!message) {
      return this.finish(
        {
          mode: 'rag',
          reason: 'Empty message — defaulting to knowledge retrieval.',
          confidence: 0.5,
          steps: [],
          includeRag: true,
        },
        started,
      );
    }

    // Conversational short-circuit — no RAG / tools.
    const smallTalk = this.smallTalk.match(message);
    if (smallTalk) {
      return this.finish(
        {
          mode: 'small_talk',
          reason: `Small talk (${smallTalk.intent}): ${smallTalk.reason}`,
          confidence: smallTalk.confidence,
          steps: [],
          includeRag: false,
        },
        started,
      );
    }

    const questionIntent = detectQuestionIntent(message);
    const actionSignals = detectToolSignals(message).filter((signal) =>
      available.has(signal.toolId),
    );

    const mutating = actionSignals.filter((signal) => signal.isMutating);
    const reads = actionSignals.filter((signal) => !signal.isMutating);
    const hybridConjunction = hasHybridConjunction(message);
    const sequenceConjunction = hasSequenceConjunction(message);

    let plan: ExecutionPlan;

    // Pure knowledge question, no actionable tool signal.
    if (questionIntent && mutating.length === 0 && !hybridConjunction) {
      plan = {
        mode: 'rag',
        reason: 'User is asking for information, not requesting an action.',
        confidence: questionIntent === 'strong' ? 0.9 : 0.75,
        steps: [],
        includeRag: true,
      };
    } else if (
      hybridConjunction &&
      questionIntent &&
      (mutating.length > 0 || reads.length > 0)
    ) {
      const steps = orderSteps([
        ...preferReadBeforeMutate(reads, mutating),
      ]).map(toStep);
      plan = {
        mode: 'hybrid',
        reason:
          'User asked for information and also requested an application action.',
        confidence: 0.82,
        steps,
        includeRag: true,
      };
    } else if (
      (sequenceConjunction || actionSignals.length > 1) &&
      actionSignals.length >= 2
    ) {
      const steps = orderSteps(actionSignals).map(toStep);
      plan = {
        mode: 'multi_step',
        reason: 'User requested multiple application actions in sequence.',
        confidence: sequenceConjunction ? 0.86 : 0.72,
        steps,
        includeRag: false,
      };
    } else if (mutating.length === 1 && !questionIntent) {
      plan = {
        mode: 'tool',
        reason: mutating[0].reason,
        confidence: Math.min(0.95, 0.7 + mutating[0].score * 0.25),
        steps: [toStep(mutating[0])],
        includeRag: false,
      };
    } else if (mutating.length === 0 && reads.length === 1 && !questionIntent) {
      plan = {
        mode: 'tool',
        reason: reads[0].reason,
        confidence: Math.min(0.9, 0.65 + reads[0].score * 0.25),
        steps: [toStep(reads[0])],
        includeRag: false,
      };
    } else if (mutating.length >= 1 && questionIntent) {
      // Soft hybrid without explicit "and" — still prefer RAG + action proposal.
      plan = {
        mode: 'hybrid',
        reason:
          'Message mixes a question with an action request — retrieve context then propose the action.',
        confidence: 0.68,
        steps: orderSteps([...reads, ...mutating]).map(toStep),
        includeRag: true,
      };
    } else if (actionSignals.length >= 1) {
      plan = {
        mode: 'tool',
        reason: actionSignals[0].reason,
        confidence: 0.7,
        steps: [toStep(actionSignals[0])],
        includeRag: false,
      };
    } else {
      plan = {
        mode: 'rag',
        reason:
          'No reliable action intent detected — using knowledge retrieval.',
        confidence: 0.6,
        steps: [],
        includeRag: true,
      };
    }

    // Never execute uncertain actions (small talk stays as-is).
    if (
      plan.mode !== 'rag' &&
      plan.mode !== 'small_talk' &&
      plan.confidence < PLANNER_CONFIDENCE_THRESHOLD
    ) {
      plan = {
        mode: 'rag',
        reason: `Planner confidence ${plan.confidence.toFixed(2)} below threshold — falling back to RAG.`,
        confidence: plan.confidence,
        steps: [],
        includeRag: true,
      };
    }

    // Drop steps for tools not in the registry (safety).
    plan = {
      ...plan,
      steps: plan.steps.filter((step) => available.has(step.toolId)),
    };

    if (
      (plan.mode === 'tool' ||
        plan.mode === 'multi_step' ||
        plan.mode === 'hybrid') &&
      plan.steps.length === 0
    ) {
      plan = {
        mode: 'rag',
        reason: 'Planned tools were unavailable — falling back to RAG.',
        confidence: 0.5,
        steps: [],
        includeRag: true,
      };
    }

    return this.finish(plan, started);
  }

  private finish(plan: ExecutionPlan, started: number): ExecutionPlan {
    if (process.env.NODE_ENV !== 'production') {
      const durationMs = Math.round(performance.now() - started);
      this.logger.debug(
        `planner mode=${plan.mode} confidence=${plan.confidence.toFixed(2)} steps=[${plan.steps
          .map((step) => step.toolId)
          .join(' → ')}] durationMs=${durationMs} reason="${plan.reason}"`,
      );
    }
    return plan;
  }
}

function toStep(signal: ToolSignal): PlanStep {
  return {
    toolId: signal.toolId,
    reason: signal.reason,
    requiresConfirmation: signal.requiresConfirmation,
  };
}

function preferReadBeforeMutate(
  reads: ToolSignal[],
  mutating: ToolSignal[],
): ToolSignal[] {
  return [...orderSteps(reads), ...orderSteps(mutating)];
}

/** Stable priority: informational lookups before mutations. */
function orderSteps(signals: ToolSignal[]): ToolSignal[] {
  const priority: Record<string, number> = {
    course: 10,
    tutor: 20,
    registration: 30,
    calendar: 40,
    profile: 50,
    document: 60,
    notification: 70,
    enrollment: 80,
  };

  return [...signals].sort((a, b) => {
    const byPriority =
      (priority[a.toolId] ?? 100) - (priority[b.toolId] ?? 100);
    if (byPriority !== 0) return byPriority;
    return b.score - a.score;
  });
}

function detectQuestionIntent(message: string): false | 'strong' | 'soft' {
  if (
    /\b(what is|what are|what's|whats|explain|describe|tell me about|how does|how do|why|overview|definition)\b/i.test(
      message,
    )
  ) {
    return 'strong';
  }
  if (
    /\?/.test(message) &&
    !/\b(enroll|cancel|book|delete|update|create|cr[ée]er?|crée|cree|planifi(?:er|e))\b/i.test(
      message,
    )
  ) {
    return 'soft';
  }
  return false;
}

function hasHybridConjunction(message: string): boolean {
  return (
    /\b(and|then|also)\b/i.test(message) &&
    /\b(enroll|enrol|register|cancel|book|update|delete|notify|notification)\b/i.test(
      message,
    ) &&
    /\b(what|explain|tell me|about|eligible|if I)\b/i.test(message)
  );
}

function hasSequenceConjunction(message: string): boolean {
  return (
    /\b(and then|then|after that|afterwards|followed by)\b/i.test(message) ||
    /\bfind\b.+\b(and|then)\b.+\b(send|notify|enroll|book|cancel)\b/i.test(
      message,
    )
  );
}

function detectToolSignals(message: string): ToolSignal[] {
  const signals: ToolSignal[] = [];

  if (
    /\b(cr[ée]er?|crée|cree|create|planifi(?:er|e)|ajouter|nouvelle?)\b.{0,40}\b(s[ée]ance|seance|session)s?\b/i.test(
      message,
    ) ||
    /\b(s[ée]ance|seance|session)s?\b.{0,20}\b(cr[ée]er?|crée|cree|create|planifi(?:er|e))\b/i.test(
      message,
    ) ||
    /\baide[- ]moi à cr[ée]er (une )?s[ée]ance\b/i.test(message) ||
    /\baide[- ]moi a creer (une )?seance\b/i.test(message)
  ) {
    signals.push({
      toolId: 'session',
      score: 0.96,
      reason: 'User wants to create or plan a session (séance).',
      requiresConfirmation: true,
      isMutating: true,
    });
  }

  if (
    /\b(enroll|enrol|sign up|register(?:\s+me)?|join)\b/i.test(message) ||
    /\b(inscription|inscrire)\b/i.test(message)
  ) {
    signals.push({
      toolId: 'enrollment',
      score: 0.95,
      reason: 'User explicitly requested enrollment.',
      isMutating: true,
    });
  }

  if (
    /\b(cancel|drop|unregister|withdraw)\b.*\b(registration|enrollment|course)\b/i.test(
      message,
    ) ||
    /\b(my registrations|show registrations|list registrations|mes inscriptions)\b/i.test(
      message,
    )
  ) {
    const cancel = /\b(cancel|drop|unregister|withdraw|annuler)\b/i.test(
      message,
    );
    signals.push({
      toolId: 'registration',
      score: cancel ? 0.92 : 0.8,
      reason: cancel
        ? 'User wants to cancel a registration.'
        : 'User asked about registrations.',
      requiresConfirmation: cancel,
      isMutating: cancel,
    });
  }

  if (
    /\b(list|show|find|search|browse)\b.*\b(course|courses|class|classes)\b/i.test(
      message,
    ) ||
    (/\b(course|courses)\b/i.test(message) &&
      !/\b(enroll|enrol|register|cancel)\b/i.test(message) &&
      !/\b(what is|explain)\b/i.test(message))
  ) {
    signals.push({
      toolId: 'course',
      score: 0.75,
      reason: 'User wants to find or list courses.',
      isMutating: false,
    });
  }

  if (
    (/\b(book|schedule|reserve)\b.*\b(tutor|tutoring|session)\b/i.test(
      message,
    ) ||
      /\b(find|show|list|who is)\b.*\b(tutor|tutors|tuteur)\b/i.test(message) ||
      /\b(my tutor|find my tutor)\b/i.test(message)) &&
    !/\b(cr[ée]er?|crée|cree|create|planifi(?:er|e))\b.{0,40}\b(s[ée]ance|seance|session)s?\b/i.test(
      message,
    )
  ) {
    const booking = /\b(book|schedule|reserve)\b/i.test(message);
    signals.push({
      toolId: 'tutor',
      score: booking ? 0.9 : 0.8,
      reason: booking
        ? 'User wants to book a tutoring session.'
        : 'User asked about tutors.',
      isMutating: booking,
    });
  }

  if (
    /\b(update|change|edit|set)\b.*\b(profile|name|first name|last name)\b/i.test(
      message,
    ) ||
    /\b(my profile|show my profile|who am i)\b/i.test(message)
  ) {
    const updating = /\b(update|change|edit|set)\b/i.test(message);
    signals.push({
      toolId: 'profile',
      score: 0.88,
      reason: updating
        ? 'User wants to update their profile.'
        : 'User asked about their profile.',
      isMutating: updating,
    });
  }

  if (
    /\b(delete|remove)\b.*\b(document|file|conversation|chat)\b/i.test(
      message,
    ) ||
    /\b(my documents|list documents|download.*certificate)\b/i.test(message)
  ) {
    const deleting = /\b(delete|remove)\b/i.test(message);
    signals.push({
      toolId: 'document',
      score: 0.85,
      reason: deleting
        ? 'User wants to delete a document or conversation.'
        : 'User asked about documents or certificates.',
      requiresConfirmation: deleting,
      isMutating: deleting,
    });
  }

  if (
    /\b(notification|notifications|alerts?|inbox|notify|send them a notification)\b/i.test(
      message,
    )
  ) {
    const notify = /\b(send|notify)\b/i.test(message);
    signals.push({
      toolId: 'notification',
      score: 0.8,
      reason: notify
        ? 'User wants to send or check a notification.'
        : 'User asked about notifications.',
      isMutating: false,
    });
  }

  if (
    /\b(timetable|schedule|agenda|calendar|emploi du temps|planning)\b/i.test(
      message,
    )
  ) {
    signals.push({
      toolId: 'calendar',
      score: 0.88,
      reason: 'User asked for their timetable/schedule.',
      isMutating: false,
    });
  }

  // Deduplicate by toolId keeping highest score.
  const byId = new Map<string, ToolSignal>();
  for (const signal of signals) {
    const existing = byId.get(signal.toolId);
    if (!existing || signal.score > existing.score) {
      byId.set(signal.toolId, signal);
    }
  }
  return [...byId.values()];
}

/** Exported for tests. */
export function isLowConfidence(plan: ExecutionPlan): boolean {
  return plan.mode !== 'rag' && plan.confidence < PLANNER_CONFIDENCE_THRESHOLD;
}

export type { PlanMode };
