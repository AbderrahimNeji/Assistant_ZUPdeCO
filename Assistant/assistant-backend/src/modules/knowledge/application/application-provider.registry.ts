import { Injectable } from '@nestjs/common';

import { ApplicationKnowledgeProvider } from './application-provider.types';
import { CourseKnowledgeSource } from './providers/course.provider';
import { FaqKnowledgeSource } from './providers/faq.provider';
import { PageContextKnowledgeSource } from './providers/page-context.provider';
import { PolicyKnowledgeSource } from './providers/policy.provider';
import { ProgramKnowledgeSource } from './providers/program.provider';
import { RegistrationKnowledgeSource } from './providers/registration.provider';
import { StudentKnowledgeSource } from './providers/student.provider';
import { TutorKnowledgeSource } from './providers/tutor.provider';
import { UserProfileKnowledgeSource } from './providers/user-profile.provider';
import { BusinessIntelligenceProvider } from '../../business-skills/bi/business-intelligence.provider';

/**
 * Single registration point for Application DB providers.
 * Add a provider here — AssistantService stays unchanged.
 */
@Injectable()
export class ApplicationProviderRegistry {
  readonly providers: ApplicationKnowledgeProvider[];

  constructor(
    pageContext: PageContextKnowledgeSource,
    businessIntelligence: BusinessIntelligenceProvider,
    userProfile: UserProfileKnowledgeSource,
    course: CourseKnowledgeSource,
    tutor: TutorKnowledgeSource,
    student: StudentKnowledgeSource,
    registration: RegistrationKnowledgeSource,
    program: ProgramKnowledgeSource,
    faq: FaqKnowledgeSource,
    policy: PolicyKnowledgeSource,
  ) {
    this.providers = [
      pageContext,
      // BI first among domain providers so live Ednov facts lead the prompt.
      businessIntelligence,
      userProfile,
      course,
      tutor,
      student,
      registration,
      program,
      faq,
      policy,
    ];
  }
}
