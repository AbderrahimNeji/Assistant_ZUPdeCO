import { Injectable, Logger } from '@nestjs/common';

import { RequestContextStore } from '../../integration/request-context';
import type { ApplicationUserContext } from '../../knowledge/application/application-provider.types';
import {
  BusinessIntelligencePlan,
  BusinessIntelligenceResult,
  BusinessQuestionCategory,
  SkillExecutionContext,
} from '../skill.types';
import { BusinessQuestionClassifier } from './business-question-classifier';
import { ResultMerger } from './result-merger';
import { SkillExecutor } from './skill-executor';
import { SkillPlanBuilder } from './skill-plan-builder';

/**
 * Business Query Engine (BQE)
 *
 * Sits between chat/BI entry and Business Skills (Planner untouched).
 * classify → plan (registry metadata) → parallel execute → merge + transparency.
 *
 * Live data only — never invents numbers.
 */
@Injectable()
export class BusinessQueryEngine {
  private readonly logger = new Logger(BusinessQueryEngine.name);

  constructor(
    private readonly classifier: BusinessQuestionClassifier,
    private readonly planBuilder: SkillPlanBuilder,
    private readonly executor: SkillExecutor,
    private readonly merger: ResultMerger,
  ) {}

  classify(question: string): BusinessQuestionCategory {
    return this.classifier.classify(question).category;
  }

  plan(question: string): BusinessIntelligencePlan {
    const classification = this.classifier.classify(question);
    return this.planBuilder.build(question, classification);
  }

  async execute(
    question: string,
    user: ApplicationUserContext,
  ): Promise<BusinessIntelligenceResult> {
    const classification = this.classifier.classify(question);
    const plan = this.planBuilder.build(question, classification);

    const applicationContext =
      RequestContextStore.getApplicationContext() ?? undefined;

    const ctx: SkillExecutionContext = {
      user,
      question,
      applicationContext,
      questionType: plan.questionType,
    };

    this.logger.debug(
      `BQE plan type=${plan.questionType} skills=[${plan.skillIds.join(',')}]`,
    );

    const { results, cacheHit } = await this.executor.execute(plan, ctx);
    const merged = this.merger.merge(plan, results, {
      classificationConfidence: classification.confidence,
      cacheHit,
    });

    return {
      plan,
      results,
      mergedFacts: merged.mergedFacts,
      transparency: merged.transparency,
      businessVisual: merged.businessVisual,
    };
  }
}
