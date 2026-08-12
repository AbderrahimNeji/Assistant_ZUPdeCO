import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SessionsService } from './sessions.service';

/**
 * Pre-creates session reports (`to_complete`) every day at 22:00 (Europe/Paris)
 * for all PLANNED sessions scheduled for the following calendar day.
 */
@Injectable()
export class SessionReportSchedulerService {
  private readonly logger = new Logger(SessionReportSchedulerService.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Cron('0 0 22 * * *', {
    name: 'session-reports-upcoming',
    timeZone: 'Europe/Paris',
  })
  async handleUpcomingSessionReports(): Promise<void> {
    try {
      const { created, skippedNoAuthor } = await this.sessionsService.ensureUpcomingSessionReportsFromJob();
      if (created > 0 || skippedNoAuthor > 0) {
        this.logger.log(
          `session-reports-upcoming: created=${created} skippedNoAuthor=${skippedNoAuthor}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `session-reports-upcoming failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
