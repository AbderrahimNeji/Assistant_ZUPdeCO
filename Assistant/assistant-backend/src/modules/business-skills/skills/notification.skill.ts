import { Injectable } from '@nestjs/common';

import { NotificationAdapter } from '../../integration/adapters/notification.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, safeErrorMessage } from '../skill.utils';

@Injectable()
export class NotificationSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'notification';
  readonly domains = [/\b(notification|notifications|alerte|alertes|inbox)\b/i];
  readonly domainTags = ['notification', 'alerts'];
  readonly capabilities: SkillCapability[] = ['list', 'count'];

  constructor(
    private readonly notifications: NotificationAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const payload = await this.notifications.listForUser(ctx.user.userId);
      const unread = await this.notifications.unreadCount();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_notifications',
        data: { unread, listed: items.length },
        facts: [
          `Unread notifications (GET /notifications/unread-count): ${unread}.`,
          `Listed notifications (GET /notifications, current user only): ${items.length}.`,
          ...items.slice(0, 10).map((item, i) => {
            const row = item as Record<string, unknown>;
            return `${i + 1}. ${String(row.title ?? row.message ?? row.type ?? 'notification')}`;
          }),
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts(this.id, error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }
}
