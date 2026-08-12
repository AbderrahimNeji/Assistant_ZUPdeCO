import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VscDailyReportsService } from './vsc-daily-reports.service';

@Injectable()
export class VscDailyReportSchedulerService {
  private readonly logger = new Logger(VscDailyReportSchedulerService.name);

  constructor(private readonly vscDailyReports: VscDailyReportsService) {}

  @Cron('0 22 * * *', {
    name: 'vsc-daily-reports-generate',
    timeZone: 'Europe/Paris',
  })
  async handleGenerateTomorrow(): Promise<void> {
    try {
      await this.vscDailyReports.generateTomorrowReportsForAllCompanies();
    } catch (e) {
      this.logger.error(`vsc-daily generate: ${(e as Error).message}`);
    }
  }

  /** Emit in-app notifications once visible_at has passed (uses existing real-time notification channel). */
  @Cron('* * * * *', { name: 'vsc-daily-reports-notify' })
  async handleDispatchNotifications(): Promise<void> {
    try {
      await this.vscDailyReports.dispatchAvailabilityNotifications();
    } catch (e) {
      this.logger.warn(`vsc-daily notify: ${(e as Error).message}`);
    }
  }
}
