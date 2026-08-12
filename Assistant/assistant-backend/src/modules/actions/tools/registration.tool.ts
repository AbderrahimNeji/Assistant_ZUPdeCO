import { Injectable } from '@nestjs/common';

import { RegistrationApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  asString,
  matchesAny,
} from '../tool.types';

@Injectable()
export class RegistrationTool implements ApplicationTool {
  readonly id = 'registration';
  readonly description =
    'List or cancel the authenticated user’s course/program registrations';

  constructor(private readonly registrations: RegistrationApplicationService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(my registrations|my enrollment|my enrolments|mes inscriptions)\b/i,
      /\b(cancel|drop|unregister|withdraw)\b.*\b(registration|enrollment|course|class)\b/i,
      /\b(annuler|désinscrire|desinscrire)\b/i,
      /\b(show|list)\b.*\b(registration|registrations|enrollment|enrollments)\b/i,
    ]);
  }

  async validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    const wantsCancel =
      input.actionId === 'cancel_registration' ||
      matchesAny(input.rawMessage, [
        /\b(cancel|drop|unregister|withdraw|annuler|désinscrire)\b/i,
      ]);

    if (wantsCancel) {
      const registrationId =
        typeof input.payload?.registrationId === 'string'
          ? input.payload.registrationId
          : undefined;

      const rows = await this.registrations.listForUser(user.userId, user.role);
      const active = rows.filter((row) => row.status === 'ACTIVE');

      if (registrationId) {
        const target = active.find((row) => row.id === registrationId);
        if (!target) {
          return {
            ok: false,
            error: 'That registration was not found or is not active.',
            recoveryActions: [
              {
                id: 'list_registrations',
                label: 'Show my registrations',
                toolId: this.id,
                style: 'secondary',
              },
            ],
          };
        }

        const label =
          target.course?.title ?? target.program?.name ?? 'this registration';

        if (
          input.actionId === 'cancel_registration' &&
          input.payload?.confirmed
        ) {
          return {
            ok: true,
            payload: { registrationId, label },
          };
        }

        return {
          ok: true,
          confirmation: {
            summary: [
              'Je peux annuler cette inscription :',
              `• Élément : ${label}`,
              `• Identifiant interne masqué (confirmation uniquement)`,
              '',
              'Confirmez pour appeler l’API Ednov. Cette action est irréversible.',
            ].join('\n'),
            payload: { registrationId, label },
          },
        };
      }

      if (!active.length) {
        return {
          ok: false,
          error: 'You have no active registrations to cancel.',
        };
      }

      return {
        ok: true,
        proposal: {
          message: 'Which registration should I cancel?',
          actions: active.slice(0, 6).map((row) => ({
            id: 'cancel_registration',
            label: `Cancel · ${row.course?.title ?? row.program?.name ?? 'Registration'}`,
            toolId: this.id,
            style: 'destructive' as const,
            requiresConfirmation: true,
            payload: { registrationId: row.id },
          })),
        },
      };
    }

    return { ok: true, payload: { list: true } };
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    if (input.actionId === 'cancel_registration') {
      const registrationId = asString(input.payload?.registrationId);
      return this.registrations.cancelRegistration(
        user.userId,
        user.role,
        registrationId,
      );
    }

    return this.registrations.listForUser(user.userId, user.role);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (
      status === 'executed' &&
      data &&
      typeof data === 'object' &&
      'status' in data
    ) {
      const row = data as {
        status: string;
        course?: { title?: string } | null;
        program?: { name?: string } | null;
      };
      const label = row.course?.title ?? row.program?.name ?? 'registration';
      return `Cancelled: “${label}” is now ${row.status}.`;
    }

    const rows = data as Array<{
      status: string;
      course?: { title?: string } | null;
      program?: { name?: string } | null;
    }>;

    if (!rows?.length) {
      return 'You have no registrations yet.';
    }

    return [
      'Your registrations:',
      ...rows.map((row, index) => {
        const label = row.course?.title ?? row.program?.name ?? 'Item';
        return `${index + 1}. [${row.status}] ${label}`;
      }),
    ].join('\n');
  }
}
