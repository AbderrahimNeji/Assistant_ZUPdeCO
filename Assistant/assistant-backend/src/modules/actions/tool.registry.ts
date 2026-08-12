import { Injectable } from '@nestjs/common';

import { ApplicationTool } from './tool.types';
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

/**
 * Single registration point for Action tools.
 * Add a tool here — AssistantService stays unchanged beyond the orchestrator call.
 */
@Injectable()
export class ToolRegistry {
  readonly tools: ApplicationTool[];

  constructor(
    enrollment: EnrollmentTool,
    registration: RegistrationTool,
    course: CourseTool,
    tutor: TutorTool,
    profile: ProfileTool,
    document: DocumentTool,
    notification: NotificationTool,
    calendar: CalendarTool,
    session: SessionTool,
    matching: MatchingTool,
    report: ReportTool,
  ) {
    this.tools = [
      enrollment,
      registration,
      course,
      tutor,
      profile,
      document,
      notification,
      calendar,
      session,
      matching,
      report,
    ];
  }

  getById(id: string): ApplicationTool | undefined {
    return this.tools.find((tool) => tool.id === id);
  }
}
