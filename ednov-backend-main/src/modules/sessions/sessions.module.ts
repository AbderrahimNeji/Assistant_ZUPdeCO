import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionConfig } from './entities/session-config.entity';
import { Session } from './entities/session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { Assignment } from './entities/assignment.entity';
import { SessionReport } from './entities/session-report.entity';
import { SessionStatusHistory } from './entities/session-status-history.entity';
import { SessionStudentTutorPair } from './entities/session-student-tutor-pair.entity';
import { BinomeCoeur } from './entities/binome-coeur.entity';
import { VscReport } from './entities/vsc-report.entity';
import { VscDailyReport } from './entities/vsc-daily-report.entity';
import { SessionAiChatMessage } from './entities/session-ai-chat-message.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsAiChatController } from './sessions-ai-chat.controller';
import { SessionsAiService } from './sessions-ai.service';
import { GroqModule } from '../groq/groq.module';
import { BinomeCoeurService } from './binome-coeur.service';
import { BinomeCoeurController } from './binome-coeur.controller';
import { VscReportGenerationService } from './vsc-report-generation.service';
import { VscReportSchedulerService } from './vsc-report-scheduler.service';
import { SessionReportSchedulerService } from './session-report-scheduler.service';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';
import { AcademicModule } from '../academic/academic.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { GamificationModule } from '../gamification/gamification.module';
import { SessionReportReminderScheduler } from './session-report-reminder.scheduler';
import { VscDailyReportsService } from './vsc-daily-reports.service';
import { VscDailyReportSchedulerService } from './vsc-daily-report.scheduler';
import { Activity } from '../activity/entities/activity.entity';
import { SchoolYear } from '../academic/entities/school-year.entity';
import { Holiday } from '../academic/entities/holiday.entity';
import { VacationZone } from '../academic/entities/vacation-zone.entity';
import { Company } from '../companies/entities/company.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { User } from '../users/entities/user.entity';
import { Room } from '../companies/entities/room.entity';

@Module({
  imports: [
    GroqModule,
    TypeOrmModule.forFeature([
      SessionConfig,
      Session,
      SessionParticipant,
      Assignment,
      SessionReport,
      SessionStatusHistory,
      SessionStudentTutorPair,
      BinomeCoeur,
      VscReport,
      VscDailyReport,
      SessionAiChatMessage,
      Activity,
      SchoolYear,
      Holiday,
      VacationZone,
      Company,
      Establishment,
      User,
      Room,
    ]),
    AuditModule,
    ActivityModule,
    AcademicModule,
    UsersModule,
    NotificationsModule,
    MailModule,
    GamificationModule,
  ],
  controllers: [SessionsAiChatController, SessionsController, BinomeCoeurController],
  providers: [
    SessionsService,
    BinomeCoeurService,
    SessionsAiService,
    VscReportGenerationService,
    VscReportSchedulerService,
    SessionReportSchedulerService,
    SessionReportReminderScheduler,
    VscDailyReportsService,
    VscDailyReportSchedulerService,
  ],
  exports: [
    TypeOrmModule,
    SessionsService,
    BinomeCoeurService,
    VscReportGenerationService,
  ],
})
export class SessionsModule {}
