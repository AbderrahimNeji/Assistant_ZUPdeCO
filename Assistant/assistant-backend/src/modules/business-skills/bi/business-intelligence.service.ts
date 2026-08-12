import { Injectable } from '@nestjs/common';

import type { ApplicationUserContext } from '../../knowledge/application/application-provider.types';
import {
  BusinessIntelligencePlan,
  BusinessIntelligenceResult,
  BusinessQuestionCategory,
} from '../skill.types';
import { BusinessQueryEngine } from './business-query-engine.service';

/**
 * Thin compatibility façade over {@link BusinessQueryEngine}.
 * Existing BI provider / module wiring keeps working unchanged.
 *
 * Authorization: every Ednov call uses the request-scoped Firebase user token
 * via EdnovApiClient + RequestContextStore (never a service account).
 */
@Injectable()
export class BusinessIntelligenceService {
  constructor(private readonly engine: BusinessQueryEngine) {}

  classifyQuestionType(question: string): BusinessQuestionCategory {
    return this.engine.classify(question);
  }

  plan(question: string): BusinessIntelligencePlan {
    return this.engine.plan(question);
  }

  async execute(
    question: string,
    user: ApplicationUserContext,
  ): Promise<BusinessIntelligenceResult> {
    return this.engine.execute(question, user);
  }
}
