import { Injectable } from '@nestjs/common';

import { NotificationApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  matchesAny,
} from '../tool.types';

@Injectable()
export class NotificationTool implements ApplicationTool {
  readonly id = 'notification';
  readonly description =
    'List notifications or mark all as read (Ednov has no public send API)';

  constructor(private readonly notifications: NotificationApplicationService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(notification|notifications|alerts?|inbox)\b/i,
      /\b(mes notifications)\b/i,
      /\b(mark|marquer).{0,20}(read|lu|lues)\b/i,
      /\b(envoyer|send).{0,30}(notification|notifications)\b/i,
    ]);
  }

  async validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    void user;

    const wantsSend = matchesAny(input.rawMessage, [
      /\b(envoyer|send).{0,30}(notification|notifications)\b/i,
    ]);
    if (wantsSend && input.actionId !== 'mark_all_read') {
      return {
        ok: true,
        proposal: {
          message: [
            'Ednov n’expose pas d’API publique « envoyer une notification » au Copilot.',
            'Les notifications sont créées côté serveur (événements métier).',
            'Je peux afficher votre boîte ou marquer toutes vos notifications comme lues.',
          ].join('\n'),
          actions: [
            {
              id: 'list_notifications',
              label: 'Voir mes notifications',
              toolId: this.id,
              style: 'secondary',
            },
            {
              id: 'mark_all_read',
              label: 'Tout marquer comme lu',
              toolId: this.id,
              style: 'primary',
              requiresConfirmation: true,
            },
          ],
        },
      };
    }

    const wantsMarkAll =
      input.actionId === 'mark_all_read' ||
      matchesAny(input.rawMessage, [
        /\b(mark|marquer).{0,30}(all|toutes?).{0,20}(read|lu|lues)\b/i,
        /\b(tout marquer comme lu)\b/i,
      ]);

    if (wantsMarkAll) {
      if (
        input.actionId === 'mark_all_read' &&
        (input.payload?.confirmed || input.payload?.alreadyConfirmed)
      ) {
        return { ok: true, payload: { markAllRead: true } };
      }
      return {
        ok: true,
        confirmation: {
          summary:
            'Je peux marquer toutes vos notifications comme lues via l’API Ednov. Confirmez pour continuer.',
          payload: { markAllRead: true },
          preview: {
            title: 'Marquer les notifications comme lues',
            entities: [{ type: 'notifications', label: 'Toutes (inbox)' }],
          },
        },
      };
    }

    return { ok: true, payload: { list: true } };
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    if (input.payload?.markAllRead) {
      await this.notifications.markAllRead();
      return { markedAllRead: true };
    }
    return this.notifications.listForUser(user.userId);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    void status;
    const row = data as {
      markedAllRead?: boolean;
      items?: Array<{ title: string; body: string }>;
      hint?: string;
    };

    if (row.markedAllRead) {
      return 'Toutes vos notifications ont été marquées comme lues.';
    }

    if (!row.items?.length) {
      return row.hint || 'You have no new notifications.';
    }

    return [
      'Notifications:',
      '',
      '| # | Title | Preview |',
      '| ---: | --- | --- |',
      ...row.items.map(
        (item, index) =>
          `| ${index + 1} | ${item.title} | ${item.body.slice(0, 80)} |`,
      ),
    ].join('\n');
  }
}
