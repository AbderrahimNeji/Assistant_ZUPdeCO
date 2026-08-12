import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from './suggestion.types';
import { MAX_SUGGESTED_ACTIONS } from './suggestion.types';
import { AttachmentSuggestionContributor } from './contributors/attachment.contributor';
import { BenchmarkSuggestionContributor } from './contributors/benchmark.contributor';
import { CalendarSuggestionContributor } from './contributors/calendar.contributor';
import { CourseSuggestionContributor } from './contributors/course.contributor';
import { DocumentSuggestionContributor } from './contributors/document.contributor';
import { EnrollmentSuggestionContributor } from './contributors/enrollment.contributor';
import { FollowUpSuggestionContributor } from './contributors/follow-up.contributor';
import { KnowledgeSuggestionContributor } from './contributors/knowledge.contributor';
import { NotificationSuggestionContributor } from './contributors/notification.contributor';
import { ProfileSuggestionContributor } from './contributors/profile.contributor';
import { RegistrationSuggestionContributor } from './contributors/registration.contributor';
import { TutorSuggestionContributor } from './contributors/tutor.contributor';

/**
 * Collects proactive suggestions from pluggable contributors.
 * No LLM calls — uses planner / knowledge / tool context only.
 */
@Injectable()
export class SuggestionService {
  private readonly contributors: SuggestionContributor[];

  constructor(
    registration: RegistrationSuggestionContributor,
    enrollment: EnrollmentSuggestionContributor,
    course: CourseSuggestionContributor,
    tutor: TutorSuggestionContributor,
    calendar: CalendarSuggestionContributor,
    profile: ProfileSuggestionContributor,
    document: DocumentSuggestionContributor,
    notification: NotificationSuggestionContributor,
    knowledge: KnowledgeSuggestionContributor,
    attachment: AttachmentSuggestionContributor,
    benchmark: BenchmarkSuggestionContributor,
    followUp: FollowUpSuggestionContributor,
  ) {
    // Order matters: earlier contributors win within the max-4 budget.
    // followUp is late so domain contributors win first; it fills remaining slots with page-aware actions.
    this.contributors = [
      attachment,
      registration,
      enrollment,
      course,
      tutor,
      calendar,
      profile,
      document,
      notification,
      knowledge,
      benchmark,
      followUp,
    ];
  }

  generate(context: SuggestionContext): SuggestedAction[] {
    const previous = new Set(context.previousSuggestionIds ?? []);
    const seen = new Set<string>();
    const ranked: SuggestedAction[] = [];

    for (const contributor of this.contributors) {
      for (const suggestion of contributor.contribute(context)) {
        if (!suggestion.id || !suggestion.label.trim()) continue;
        if (previous.has(suggestion.id)) continue;
        if (seen.has(suggestion.id)) continue;
        seen.add(suggestion.id);
        ranked.push(suggestion);
        if (ranked.length >= MAX_SUGGESTED_ACTIONS) {
          return ranked;
        }
      }
    }

    return ranked;
  }
}
