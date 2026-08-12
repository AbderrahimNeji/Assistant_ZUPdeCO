import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DocumentsModule } from '../documents/documents.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessSkillsModule } from '../business-skills/business-skills.module';
import { ApplicationProviderRegistry } from './application/application-provider.registry';
import { CourseKnowledgeSource } from './application/providers/course.provider';
import { FaqKnowledgeSource } from './application/providers/faq.provider';
import { PageContextKnowledgeSource } from './application/providers/page-context.provider';
import { PolicyKnowledgeSource } from './application/providers/policy.provider';
import { ProgramKnowledgeSource } from './application/providers/program.provider';
import { RegistrationKnowledgeSource } from './application/providers/registration.provider';
import { StudentKnowledgeSource } from './application/providers/student.provider';
import { TutorKnowledgeSource } from './application/providers/tutor.provider';
import { UserProfileKnowledgeSource } from './application/providers/user-profile.provider';
import { DocumentationChunkerService } from './documentation/documentation-chunker.service';
import { DocumentationCitationService } from './documentation/documentation-citation.service';
import { DocumentationIngestService } from './documentation/documentation-ingest.service';
import { DocumentationKnowledgeSource } from './documentation/documentation-knowledge.source';
import { DocumentationRetrievalService } from './documentation/documentation-retrieval.service';
import { QuestionRouterService } from './documentation/question-router.service';
import { KnowledgeOrchestratorService } from './knowledge-orchestrator.service';
import { KnowledgeService } from './knowledge.service';
import { ApplicationKnowledgeSource } from './sources/application-knowledge.source';
import { ConversationAttachmentKnowledgeSource } from './sources/conversation-attachment.source';
import { DocumentKnowledgeSource } from './sources/document-knowledge.source';

@Module({
  imports: [PrismaModule, DocumentsModule, ConfigModule, BusinessSkillsModule],
  providers: [
    KnowledgeService,
    ConversationAttachmentKnowledgeSource,
    DocumentKnowledgeSource,
    DocumentationChunkerService,
    DocumentationCitationService,
    DocumentationIngestService,
    DocumentationRetrievalService,
    DocumentationKnowledgeSource,
    QuestionRouterService,
    PageContextKnowledgeSource,
    UserProfileKnowledgeSource,
    CourseKnowledgeSource,
    TutorKnowledgeSource,
    StudentKnowledgeSource,
    RegistrationKnowledgeSource,
    ProgramKnowledgeSource,
    FaqKnowledgeSource,
    PolicyKnowledgeSource,
    ApplicationProviderRegistry,
    ApplicationKnowledgeSource,
    KnowledgeOrchestratorService,
  ],
  exports: [
    KnowledgeOrchestratorService,
    KnowledgeService,
    DocumentationIngestService,
    DocumentationRetrievalService,
    QuestionRouterService,
  ],
})
export class KnowledgeModule {}
