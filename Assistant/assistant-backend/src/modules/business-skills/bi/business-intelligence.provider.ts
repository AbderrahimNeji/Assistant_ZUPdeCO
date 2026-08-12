import { Injectable } from '@nestjs/common';

import { SensitiveDataRedactor } from '../../../common/security/sensitive-data-redactor';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  matchesAny,
} from '../../knowledge/application/application-provider.types';
import {
  isEdnovDataSource,
  RequestContextStore,
} from '../../integration/request-context';
import { BusinessIntelligenceService } from './business-intelligence.service';
import type { BusinessIntelligenceResult } from '../skill.types';

/**
 * Bridges Business Query Engine into the existing ApplicationKnowledgeSource.
 * Planner remains on RAG for question-shaped turns — no Planner changes.
 * Knowledge Orchestrator API surface stays unchanged.
 */
@Injectable()
export class BusinessIntelligenceProvider implements ApplicationKnowledgeProvider {
  readonly id = 'business_intelligence';

  constructor(private readonly bi: BusinessIntelligenceService) {}

  canHandle(question: string, user: ApplicationUserContext): boolean {
    void user;
    if (!isEdnovDataSource()) {
      return matchesAny(question, [
        /\b(how many|combien|student|tutor|session|séance|report|dashboard|statistic|planning|matching|binôme)\b/i,
      ]);
    }

    const page = RequestContextStore.getApplicationContext();
    if (
      page?.student?.id ||
      page?.tutor?.id ||
      page?.session?.id ||
      page?.establishment?.id ||
      page?.report?.id ||
      page?.matching?.id ||
      page?.program?.id ||
      page?.selection?.primary?.id
    ) {
      return true;
    }

    return matchesAny(question, [
      /\b(how many|combien|count|nombre)\b/i,
      /\b(student|students|élève|eleve|élèves|eleves)\b/i,
      /\b(tutor|tutors|tuteur|tuteurs)\b/i,
      /\b(session|sessions|séance|seance)\b/i,
      /\b(program|programme|parcours)\b/i,
      /\b(registrat|inscription|enroll)\b/i,
      /\b(attendance|présence|presence|absent|attended)\b/i,
      /\b(report|reports|compte.?rendu|comptes?-?rendus?|soumis|à valider|a valider|en attente de validation)\b/i,
      /\b(notification|alerte)\b/i,
      /\b(calendar|calendrier|planning|schedule|emploi du temps)\b/i,
      /\b(dashboard|statistic|stats|établissement|etablissement|moyenne|company|entreprise|plus actifs?|moins actifs?|most active|least active|classement)\b/i,
      /\b(document|resource|fichier)\b/i,
      /\b(match|matching|binôme|binome|without a tutor|sans tuteur|unmatched|waiting for a tutor)\b/i,
      /\b(who am i|mon profil|my profile)\b/i,
      /\b(this student|cet élève|this session|cette séance|summarize|résume|this tutor|this report)\b/i,
      /\b(next|prochaine?|last|derni[eè]re?|open|ouvre|profil|profile|particip|coordinator|coordinateur|gamification|vsc|joined)\b/i,
      /\b(open|ouvre|ouvrir)\s+[A-ZÀ-Ÿ]/u,
    ]);
  }

  async retrieve(
    question: string,
    user: ApplicationUserContext,
  ): Promise<BusinessIntelligenceResult> {
    return this.bi.execute(question, user);
  }

  formatContext(data: unknown): string {
    const result = data as BusinessIntelligenceResult;
    if (!result?.mergedFacts?.length) {
      return 'Business Intelligence: no live facts available.';
    }
    return SensitiveDataRedactor.redact(result.mergedFacts.join('\n'));
  }
}
