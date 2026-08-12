import { Module } from '@nestjs/common';

import { SkillAuditService } from '../../common/security/skill-audit.service';
import { IntegrationModule } from '../integration/integration.module';
import { SkillAggregationService } from './aggregation/skill-aggregation.service';
import { BusinessIntelligenceProvider } from './bi/business-intelligence.provider';
import { BusinessIntelligenceService } from './bi/business-intelligence.service';
import { BusinessQueryEngine } from './bi/business-query-engine.service';
import { BusinessQuestionClassifier } from './bi/business-question-classifier';
import { ResultMerger } from './bi/result-merger';
import { SkillExecutor } from './bi/skill-executor';
import { SkillPlanBuilder } from './bi/skill-plan-builder';
import { BusinessSkillRegistry } from './skill.registry';
import { StudentSkill } from './skills/student.skill';
import { TutorSkill } from './skills/tutor.skill';
import { MatchingSkill } from './skills/matching.skill';
import { SessionSkill } from './skills/session.skill';
import { ProgramSkill } from './skills/program.skill';
import { RegistrationSkill } from './skills/registration.skill';
import { AttendanceSkill } from './skills/attendance.skill';
import { ReportSkill } from './skills/report.skill';
import { NotificationSkill } from './skills/notification.skill';
import { CalendarSkill } from './skills/calendar.skill';
import { UserSkill } from './skills/user.skill';
import { DashboardSkill } from './skills/dashboard.skill';
import { StatisticsSkill } from './skills/statistics.skill';
import { DocumentSkill } from './skills/document.skill';
import { EstablishmentSkill } from './skills/establishment.skill';
import { ConfigurationSkill } from './skills/configuration.skill';
import { ParentSkill } from './skills/parent.skill';
import { GamificationSkill } from './skills/gamification.skill';
import { VscReportSkill } from './skills/vsc-report.skill';
import { BinomeSkill } from './skills/binome.skill';
import { OnboardingSkill } from './skills/onboarding.skill';

const SKILLS = [
  StudentSkill,
  TutorSkill,
  MatchingSkill,
  SessionSkill,
  ProgramSkill,
  RegistrationSkill,
  AttendanceSkill,
  ReportSkill,
  NotificationSkill,
  CalendarSkill,
  UserSkill,
  DashboardSkill,
  StatisticsSkill,
  DocumentSkill,
  EstablishmentSkill,
  ConfigurationSkill,
  ParentSkill,
  GamificationSkill,
  VscReportSkill,
  BinomeSkill,
  OnboardingSkill,
];

@Module({
  imports: [IntegrationModule],
  providers: [
    ...SKILLS,
    BusinessSkillRegistry,
    BusinessQuestionClassifier,
    SkillPlanBuilder,
    SkillExecutor,
    ResultMerger,
    BusinessQueryEngine,
    BusinessIntelligenceService,
    BusinessIntelligenceProvider,
    SkillAuditService,
    SkillAggregationService,
  ],
  exports: [
    BusinessSkillRegistry,
    BusinessQueryEngine,
    BusinessIntelligenceService,
    BusinessIntelligenceProvider,
    SkillAuditService,
  ],
})
export class BusinessSkillsModule {}
