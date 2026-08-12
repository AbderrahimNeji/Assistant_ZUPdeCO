import { Module } from '@nestjs/common';

import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

import { ActionsModule } from '../actions/actions.module';
import { AuthModule } from '../auth/auth.module';
import { ConversationModule } from '../conversation/conversation.module';
import { DocumentsModule } from '../documents/documents.module';
import { IntentModule } from '../intent/intent.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { LanguageModule } from '../language/language.module';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { SmallTalkModule } from '../small-talk/small-talk.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AttachmentSuggestionContributor } from './suggestions/contributors/attachment.contributor';
import { BenchmarkSuggestionContributor } from './suggestions/contributors/benchmark.contributor';
import { CalendarSuggestionContributor } from './suggestions/contributors/calendar.contributor';
import { CourseSuggestionContributor } from './suggestions/contributors/course.contributor';
import { DocumentSuggestionContributor } from './suggestions/contributors/document.contributor';
import { EnrollmentSuggestionContributor } from './suggestions/contributors/enrollment.contributor';
import { FollowUpSuggestionContributor } from './suggestions/contributors/follow-up.contributor';
import { KnowledgeSuggestionContributor } from './suggestions/contributors/knowledge.contributor';
import { NotificationSuggestionContributor } from './suggestions/contributors/notification.contributor';
import { ProfileSuggestionContributor } from './suggestions/contributors/profile.contributor';
import { RegistrationSuggestionContributor } from './suggestions/contributors/registration.contributor';
import { TutorSuggestionContributor } from './suggestions/contributors/tutor.contributor';
import { ProactiveSuggestionFacade } from './suggestions/proactive-suggestion.facade';
import { SuggestionService } from './suggestions/suggestion.service';

@Module({
  imports: [
    AuthModule,
    LlmModule,
    LanguageModule,
    IntentModule,
    MemoryModule,
    DocumentsModule,
    PromptBuilderModule,
    KnowledgeModule,
    ConversationModule,
    ActionsModule,
    EvaluationModule,
    SmallTalkModule,
    WorkflowModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    SuggestionService,
    ProactiveSuggestionFacade,
    EnrollmentSuggestionContributor,
    RegistrationSuggestionContributor,
    CourseSuggestionContributor,
    TutorSuggestionContributor,
    CalendarSuggestionContributor,
    ProfileSuggestionContributor,
    DocumentSuggestionContributor,
    NotificationSuggestionContributor,
    KnowledgeSuggestionContributor,
    AttachmentSuggestionContributor,
    BenchmarkSuggestionContributor,
    FollowUpSuggestionContributor,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}
