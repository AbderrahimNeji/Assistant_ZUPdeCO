import { Injectable } from '@nestjs/common';

import {
  BusinessQuestionCategory,
  capabilitiesForCategory,
  SkillCapability,
} from '../skill.types';

export type ClassificationResult = {
  category: BusinessQuestionCategory;
  confidence: number;
  /** True when functional/docs signals co-occur with live-data signals. */
  hybridSignals: boolean;
  requestedCapabilities: SkillCapability[];
};

/**
 * Classifies natural-language business questions into BQE categories.
 * Pure regex heuristics — no LLM, no invented data.
 */
@Injectable()
export class BusinessQuestionClassifier {
  classify(question: string): ClassificationResult {
    const q = question?.trim() || '';
    if (!q) {
      return {
        category: 'UNKNOWN',
        confidence: 0.2,
        hybridSignals: false,
        requestedCapabilities: capabilitiesForCategory('UNKNOWN'),
      };
    }

    const hybridSignals = this.hasFunctionalSignal(q) && this.hasLiveSignal(q);

    let category: BusinessQuestionCategory;
    let confidence: number;

    if (this.isCount(q)) {
      category = 'COUNT';
      confidence = 0.9;
    } else if (this.isComparison(q)) {
      category = 'COMPARISON';
      confidence = 0.88;
    } else if (this.isStatistics(q)) {
      category = 'STATISTICS';
      confidence = 0.86;
    } else if (this.isSearch(q)) {
      category = 'SEARCH';
      confidence = 0.84;
    } else if (this.isStatus(q)) {
      category = 'STATUS';
      confidence = 0.82;
    } else if (this.isList(q)) {
      category = 'LIST';
      confidence = 0.8;
    } else if (hybridSignals) {
      category = 'HYBRID';
      confidence = 0.75;
    } else {
      category = 'UNKNOWN';
      confidence = 0.45;
    }

    // Prefer HYBRID when docs + live both clearly apply, even if a live type matched.
    if (hybridSignals && category !== 'COUNT' && category !== 'STATISTICS') {
      category = 'HYBRID';
      confidence = Math.max(confidence, 0.78);
    }

    return {
      category,
      confidence,
      hybridSignals,
      requestedCapabilities: capabilitiesForCategory(category),
    };
  }

  private isCount(q: string): boolean {
    return /\b(how many|combien|count|nombre de|nombre d['’])\b/i.test(q);
  }

  private isSearch(q: string): boolean {
    return /\b(find|search|cherche|chercher|montre|show|who is|qui est|look up|retrouver)\b/i.test(
      q,
    );
  }

  private isStatus(q: string): boolean {
    return /\b(has|have|did|déjà|deja|submitted|soumis|verify|vérifie|verifie|status|statut|état|etat)\b/i.test(
      q,
    );
  }

  private isList(q: string): boolean {
    return /\b(list|liste|show all|affiche|sans |without|which|quels?|quelles?)\b/i.test(
      q,
    );
  }

  private isStatistics(q: string): boolean {
    return /\b(average|moyenne|rate|taux|statistic|stats|kpi|indicateurs?)\b/i.test(
      q,
    );
  }

  private isComparison(q: string): boolean {
    return /\b(most|plus de|highest|lowest|compare|comparison|versus|vs\.?|par rapport)\b/i.test(
      q,
    );
  }

  private hasFunctionalSignal(q: string): boolean {
    return /\b(how does|how do|what is|what are|qu['’]est[- ]ce|c['’]est quoi|comment (fonctionne|marche)|documentation|processus|règle|regle|workflow|onboarding)\b/i.test(
      q,
    );
  }

  private hasLiveSignal(q: string): boolean {
    return /\b(how many|combien|count|list|liste|today|aujourd|stats|dashboard|this student|cet élève|cet eleve|show|montre|find|cherche)\b/i.test(
      q,
    );
  }
}
