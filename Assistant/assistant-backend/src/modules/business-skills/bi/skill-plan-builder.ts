import { Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../integration/request-context';
import { BusinessSkillRegistry } from '../skill.registry';
import {
  BusinessIntelligencePlan,
  BusinessQuestionCategory,
  BusinessSkillId,
  SkillCapability,
} from '../skill.types';
import type { ClassificationResult } from './business-question-classifier';

const MAX_SKILLS = 5;

/**
 * Builds a multi-domain skill plan from registry metadata
 * (domain tags + capabilities + keyword domains) — not a hardcoded module list.
 */
@Injectable()
export class SkillPlanBuilder {
  constructor(private readonly registry: BusinessSkillRegistry) {}

  build(
    question: string,
    classification: ClassificationResult,
  ): BusinessIntelligencePlan {
    const selected = new Set<BusinessSkillId>();
    const domainsMatched = new Set<string>();

    for (const skill of this.registry.skills) {
      if (skill.domains.some((pattern) => pattern.test(question))) {
        selected.add(skill.id);
        for (const tag of skill.domainTags) domainsMatched.add(tag);
      }
    }

    this.applyCapabilityBoost(selected, classification.requestedCapabilities);
    this.applyEnrichmentRules(question, selected, classification.category);
    this.applyApplicationContext(question, selected);

    let skillIds = [...selected];
    if (!skillIds.length) {
      skillIds =
        classification.category === 'COUNT'
          ? this.fallbackByCapability(
              ['count', 'stats'],
              ['dashboard', 'statistics'],
            )
          : this.fallbackByCapability(['status', 'search'], ['user']);
    }

    skillIds = skillIds.slice(0, MAX_SKILLS);

    for (const id of skillIds) {
      const skill = this.registry.getById(id);
      skill?.domainTags.forEach((tag) => domainsMatched.add(tag));
    }

    return {
      questionType: classification.category,
      skillIds,
      domains: [...domainsMatched],
      requestedCapabilities: classification.requestedCapabilities,
      rationale: `type=${classification.category}; skills=${skillIds.join(',')}; conf=${classification.confidence.toFixed(2)}`,
    };
  }

  private applyCapabilityBoost(
    selected: Set<BusinessSkillId>,
    capabilities: SkillCapability[],
  ): void {
    if (!selected.size) return;
    // When we already matched domains, prefer skills that also advertise
    // the requested capability — do not force-add unrelated modules.
    for (const skill of this.registry.skills) {
      if (!selected.has(skill.id)) continue;
      const overlap = skill.capabilities.some((c) => capabilities.includes(c));
      if (!overlap && capabilities.length && selected.size > 2) {
        // Soft demote later via slice order — keep for now.
      }
    }
  }

  private applyEnrichmentRules(
    question: string,
    selected: Set<BusinessSkillId>,
    category: BusinessQuestionCategory,
  ): void {
    if (
      selected.has('student') &&
      /\b(tutor|tuteur|match|binôme|binome)\b/i.test(question)
    ) {
      selected.add('matching');
    }
    if (
      (selected.has('student') || selected.has('tutor')) &&
      /\b(report|compte.?rendu|soumis)\b/i.test(question)
    ) {
      selected.add('report');
    }
    if (
      selected.has('tutor') &&
      /\b(most students|plus d['’]élèves|plus d['’]eleves)\b/i.test(question)
    ) {
      selected.add('statistics');
    }
    if (
      selected.has('session') &&
      /\b(report|attendance|présence|presence)\b/i.test(question)
    ) {
      selected.add('attendance');
      selected.add('report');
    }
    if (category === 'COMPARISON' || category === 'STATISTICS') {
      this.addIfRegistered(selected, 'statistics');
      this.addIfRegistered(selected, 'dashboard');
    }
    if (/\b(who am i|mon profil|my profile)\b/i.test(question)) {
      selected.add('user');
    }
    if (
      /\b(next session|prochaine|planning|calendar|calendrier)\b/i.test(
        question,
      )
    ) {
      selected.add('calendar');
      selected.add('session');
    }
    if (
      /\b(parent|parents|guardian|tuteur légal)\b/i.test(question) &&
      selected.has('student')
    ) {
      selected.add('parent');
    }
  }

  private applyApplicationContext(
    question: string,
    selected: Set<BusinessSkillId>,
  ): void {
    const appCtx = RequestContextStore.getApplicationContext();
    if (!appCtx) return;

    const focused =
      /\b(this|cet|cette|selected|focused)\b/i.test(question) ||
      selected.size === 0;

    if (
      (appCtx.student?.id || appCtx.selection?.primary?.type === 'student') &&
      focused
    ) {
      selected.add('student');
    }
    if (
      (appCtx.session?.id || appCtx.selection?.primary?.type === 'session') &&
      /\b(this|cette|selected|focused|summarize|résume)\b/i.test(question)
    ) {
      selected.add('session');
    }
    if (appCtx.tutor?.id || appCtx.selection?.primary?.type === 'tutor') {
      selected.add('tutor');
    }
    if (
      (appCtx.establishment?.id ||
        appCtx.selection?.primary?.type === 'establishment') &&
      (focused ||
        /\b(établissement|etablissement)\b/i.test(question) ||
        selected.size === 0)
    ) {
      selected.add('establishment');
    }
    if (appCtx.matching?.id || appCtx.selection?.primary?.type === 'matching') {
      selected.add('matching');
    }
    if (appCtx.report?.id || appCtx.selection?.primary?.type === 'report') {
      selected.add('report');
    }
    if (appCtx.parent?.id || appCtx.selection?.primary?.type === 'parent') {
      selected.add('parent');
    }
  }

  private fallbackByCapability(
    capabilities: SkillCapability[],
    preferredIds: BusinessSkillId[],
  ): BusinessSkillId[] {
    const fromRegistry = this.registry
      .findByCapabilities(capabilities)
      .map((s) => s.id);
    const preferred = preferredIds.filter((id) => this.registry.getById(id));
    return [...new Set([...preferred, ...fromRegistry])].slice(0, MAX_SKILLS);
  }

  private addIfRegistered(
    selected: Set<BusinessSkillId>,
    id: BusinessSkillId,
  ): void {
    if (this.registry.getById(id)) selected.add(id);
  }
}
