import { UserRole } from '@prisma/client';

import type { ApplicationContext } from '../integration/request-context';
import type { ApplicationUserContext } from '../knowledge/application/application-provider.types';

/** Stable skill identifiers used by the BQE classifier and registry. */
export type BusinessSkillId =
  | 'student'
  | 'tutor'
  | 'matching'
  | 'session'
  | 'program'
  | 'registration'
  | 'attendance'
  | 'report'
  | 'notification'
  | 'calendar'
  | 'user'
  | 'dashboard'
  | 'statistics'
  | 'document'
  | 'establishment'
  | 'configuration'
  | 'parent'
  | 'gamification'
  | 'vsc-report'
  | 'binome'
  | 'onboarding';

/**
 * Business Query Engine question categories.
 * HYBRID means live skills + docs (docs still come from QuestionRouter / KO).
 */
export type BusinessQuestionCategory =
  | 'COUNT'
  | 'SEARCH'
  | 'STATUS'
  | 'LIST'
  | 'STATISTICS'
  | 'COMPARISON'
  | 'HYBRID'
  | 'UNKNOWN';

/** @deprecated Prefer BusinessQuestionCategory — kept as alias for call sites. */
export type BusinessQuestionType = BusinessQuestionCategory;

/** What a skill can answer (data-driven planning). */
export type SkillCapability =
  'count' | 'search' | 'status' | 'list' | 'stats' | 'comparison';

export type SkillExecutionContext = {
  user: ApplicationUserContext;
  question: string;
  applicationContext?: ApplicationContext;
  questionType: BusinessQuestionCategory;
};

/**
 * Structured payload returned by every Business Skill.
 * The LLM may only explain/summarize these facts — never invent data.
 */
export type SkillResult<T = unknown> = {
  skillId: BusinessSkillId;
  ok: boolean;
  /** Short machine-oriented label for the operation performed. */
  operation: string;
  data: T;
  /** Human-readable facts for the prompt (no prose speculation). */
  facts: string[];
  warnings?: string[];
  /** Optional duration filled by SkillExecutor. */
  durationMs?: number;
};

export interface BusinessSkill {
  readonly id: BusinessSkillId;
  /** Keyword / phrase patterns this skill owns (routing hints). */
  readonly domains: RegExp[];
  /**
   * Stable domain tags for registry discovery
   * (new module = Adapter + Skill with tags — no BQE hardcode).
   */
  readonly domainTags: string[];
  /** Capabilities this skill can fulfill for capability-aware planning. */
  readonly capabilities: SkillCapability[];
  /**
   * Execute against live Ednov services for the given question.
   * Must not access the DB directly; must honor Ednov auth via adapters.
   */
  execute(ctx: SkillExecutionContext): Promise<SkillResult>;
}

export type BusinessIntelligencePlan = {
  questionType: BusinessQuestionCategory;
  skillIds: BusinessSkillId[];
  rationale: string;
  /** Domains inferred from registry metadata. */
  domains?: string[];
  /** Capabilities requested by the classified question. */
  requestedCapabilities?: SkillCapability[];
};

/** Transparency metadata for UI / ExecutionTrace (never invents numbers). */
export type BusinessTransparency = {
  dataSource: 'ednov_live';
  questionCategory: BusinessQuestionCategory;
  skillsExecuted: BusinessSkillId[];
  skillsSucceeded: BusinessSkillId[];
  skillsFailed: BusinessSkillId[];
  modulesQueried: string[];
  confidence: number;
  /** ISO timestamp when live facts were fetched. */
  freshness: string;
  partial: boolean;
  cacheHit?: boolean;
  rationale?: string;
};

export type BusinessVisualKpi = {
  label: string;
  value: string | number;
};

export type BusinessVisualTable = {
  title?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
};

export type BusinessVisualRanking = {
  title?: string;
  items: Array<{ label: string; value?: string | number; rank?: number }>;
};

/**
 * Structured visual payload for the chat UI (additive).
 * Frontend may also render Markdown tables already present in the answer.
 */
export type BusinessVisual = {
  kind: 'table' | 'kpis' | 'ranking' | 'mixed';
  title?: string;
  kpis?: BusinessVisualKpi[];
  tables?: BusinessVisualTable[];
  rankings?: BusinessVisualRanking[];
};

export type BusinessIntelligenceResult = {
  plan: BusinessIntelligencePlan;
  results: SkillResult[];
  mergedFacts: string[];
  transparency: BusinessTransparency;
  businessVisual?: BusinessVisual;
};

export function isStaffRole(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.COORDINATOR ||
    role === UserRole.TUTOR
  );
}

/** Map question category → skill capabilities used for registry discovery. */
export function capabilitiesForCategory(
  category: BusinessQuestionCategory,
): SkillCapability[] {
  switch (category) {
    case 'COUNT':
      return ['count'];
    case 'SEARCH':
      return ['search'];
    case 'STATUS':
      return ['status'];
    case 'LIST':
      return ['list'];
    case 'STATISTICS':
      return ['stats', 'count'];
    case 'COMPARISON':
      return ['comparison', 'stats'];
    case 'HYBRID':
      return ['search', 'list', 'status', 'count'];
    case 'UNKNOWN':
    default:
      return ['search', 'list', 'status'];
  }
}
