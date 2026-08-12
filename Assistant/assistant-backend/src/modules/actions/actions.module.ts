import { Module } from '@nestjs/common';

import { SkillAuditService } from '../../common/security/skill-audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationModule } from '../conversation/conversation.module';
import { DocumentsModule } from '../documents/documents.module';
import { SmallTalkModule } from '../small-talk/small-talk.module';
import {
  CalendarApplicationService,
  CourseApplicationService,
  MatchingApplicationService,
  NotificationApplicationService,
  ProfileApplicationService,
  RegistrationApplicationService,
  ReportApplicationService,
  SessionApplicationService,
  TutorApplicationService,
} from './application/domain-application.services';
import { ToolConfirmationService } from './tool-confirmation.service';
import { PlannerService } from './planner.service';
import { ToolOrchestratorService } from './tool-orchestrator.service';
import { ToolRegistry } from './tool.registry';
import { CalendarTool } from './tools/calendar.tool';
import { CourseTool } from './tools/course.tool';
import { DocumentTool } from './tools/document.tool';
import { EnrollmentTool } from './tools/enrollment.tool';
import { MatchingTool } from './tools/matching.tool';
import { NotificationTool } from './tools/notification.tool';
import { ProfileTool } from './tools/profile.tool';
import { RegistrationTool } from './tools/registration.tool';
import { ReportTool } from './tools/report.tool';
import { SessionTool } from './tools/session.tool';
import { TutorTool } from './tools/tutor.tool';

@Module({
  imports: [PrismaModule, DocumentsModule, ConversationModule, SmallTalkModule],
  providers: [
    SkillAuditService,
    CourseApplicationService,
    RegistrationApplicationService,
    ProfileApplicationService,
    TutorApplicationService,
    CalendarApplicationService,
    NotificationApplicationService,
    SessionApplicationService,
    MatchingApplicationService,
    ReportApplicationService,
    EnrollmentTool,
    RegistrationTool,
    CourseTool,
    TutorTool,
    ProfileTool,
    DocumentTool,
    NotificationTool,
    CalendarTool,
    SessionTool,
    MatchingTool,
    ReportTool,
    ToolRegistry,
    ToolConfirmationService,
    PlannerService,
    ToolOrchestratorService,
  ],
  exports: [ToolOrchestratorService, ToolRegistry, PlannerService],
})
export class ActionsModule {}
