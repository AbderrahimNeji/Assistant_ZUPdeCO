import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AssignedPostItTemplatesService } from './assigned-post-it-templates.service';

@Injectable()
export class AssignedPostItsSchedulerService {
  private readonly logger = new Logger(AssignedPostItsSchedulerService.name);

  constructor(
    private readonly assignedPostItTemplatesService: AssignedPostItTemplatesService,
  ) {}

  @Cron('0 0 * * *', { name: 'assigned-post-its-provision' })
  async handleDailyProvisioning(): Promise<void> {
    this.logger.log('Running daily assigned post-its provisioning...');
    try {
      await this.assignedPostItTemplatesService.runDueTemplates();
    } catch (error) {
      this.logger.error(`Daily assigned post-its provisioning failed: ${error.message}`, error.stack);
    }
  }
}
