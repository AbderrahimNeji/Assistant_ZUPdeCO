import { Injectable } from '@nestjs/common';

import { BusinessSkill, BusinessSkillId, SkillCapability } from './skill.types';
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

/**
 * Single registration point for Business Skills.
 * Adding an Ednov module = create one Skill + register it here.
 * BQE discovers skills via domainTags / capabilities — no per-module hardcode in the engine.
 */
@Injectable()
export class BusinessSkillRegistry {
  readonly skills: BusinessSkill[];

  constructor(
    student: StudentSkill,
    tutor: TutorSkill,
    matching: MatchingSkill,
    session: SessionSkill,
    program: ProgramSkill,
    registration: RegistrationSkill,
    attendance: AttendanceSkill,
    report: ReportSkill,
    notification: NotificationSkill,
    calendar: CalendarSkill,
    user: UserSkill,
    dashboard: DashboardSkill,
    statistics: StatisticsSkill,
    document: DocumentSkill,
    establishment: EstablishmentSkill,
    configuration: ConfigurationSkill,
    parent: ParentSkill,
    gamification: GamificationSkill,
    vscReport: VscReportSkill,
    binome: BinomeSkill,
    onboarding: OnboardingSkill,
  ) {
    this.skills = [
      student,
      tutor,
      matching,
      session,
      program,
      registration,
      attendance,
      report,
      notification,
      calendar,
      user,
      dashboard,
      statistics,
      document,
      establishment,
      configuration,
      parent,
      gamification,
      vscReport,
      binome,
      onboarding,
    ];
  }

  getById(id: BusinessSkillId): BusinessSkill | undefined {
    return this.skills.find((skill) => skill.id === id);
  }

  listIds(): BusinessSkillId[] {
    return this.skills.map((skill) => skill.id);
  }

  findByDomainTag(tag: string): BusinessSkill[] {
    const normalized = tag.trim().toLowerCase();
    return this.skills.filter((skill) =>
      skill.domainTags.some((t) => t.toLowerCase() === normalized),
    );
  }

  findByCapabilities(capabilities: SkillCapability[]): BusinessSkill[] {
    if (!capabilities.length) return [];
    return this.skills.filter((skill) =>
      skill.capabilities.some((cap) => capabilities.includes(cap)),
    );
  }
}
