import { Injectable } from '@nestjs/common';

import { ProfileApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  matchesAny,
} from '../tool.types';

@Injectable()
export class ProfileTool implements ApplicationTool {
  readonly id = 'profile';
  readonly description =
    'Show or update the authenticated user’s own profile fields';

  constructor(private readonly profiles: ProfileApplicationService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(update|change|edit|set)\b.*\b(profile|name|first name|last name)\b/i,
      /\b(my profile|show my profile|who am i)\b/i,
      /\b(profil|mettre à jour mon profil)\b/i,
    ]);
  }

  validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    if (input.actionId === 'update_profile') {
      const firstName =
        typeof input.payload?.firstName === 'string'
          ? input.payload.firstName.trim()
          : undefined;
      const lastName =
        typeof input.payload?.lastName === 'string'
          ? input.payload.lastName.trim()
          : undefined;

      if (!firstName && !lastName) {
        return Promise.resolve({
          ok: false,
          error: 'Provide a first name and/or last name to update.',
        });
      }

      return Promise.resolve({ ok: true, payload: { firstName, lastName } });
    }

    const parsed = parseNameUpdate(input.rawMessage);
    if (parsed) {
      return Promise.resolve({
        ok: true,
        proposal: {
          message: `Your profile can be updated to ${[
            parsed.firstName ?? user.firstName,
            parsed.lastName ?? user.lastName,
          ].join(' ')}.`,
          actions: [
            {
              id: 'update_profile',
              label: 'Update',
              toolId: this.id,
              style: 'primary',
              payload: parsed,
            },
          ],
        },
        payload: parsed,
      });
    }

    return Promise.resolve({ ok: true, payload: { view: true } });
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    if (input.actionId === 'update_profile') {
      return this.profiles.updateOwn(user.userId, {
        firstName:
          typeof input.payload?.firstName === 'string'
            ? input.payload.firstName
            : undefined,
        lastName:
          typeof input.payload?.lastName === 'string'
            ? input.payload.lastName
            : undefined,
      });
    }

    return this.profiles.getOwn(user.userId);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    const row = data as {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };

    if (status === 'executed' && row) {
      return [
        'Profile updated:',
        `- Name: ${row.firstName} ${row.lastName}`,
        `- Email: ${row.email}`,
        `- Role: ${row.role}`,
      ].join('\n');
    }

    return [
      'Your profile:',
      `- Name: ${row.firstName} ${row.lastName}`,
      `- Email: ${row.email}`,
      `- Role: ${row.role}`,
    ].join('\n');
  }
}

function parseNameUpdate(
  message: string,
): { firstName?: string; lastName?: string } | null {
  const full =
    /\b(?:change|update|set)\s+(?:my\s+)?name\s+to\s+([^\d?.!]+)/i.exec(
      message,
    );
  if (full?.[1]) {
    const parts = full[1].trim().split(/\s+/);
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
      };
    }
    if (parts.length === 1) {
      return { firstName: parts[0] };
    }
  }

  const first =
    /\b(?:change|update|set)\s+(?:my\s+)?first\s*name\s+to\s+(\p{L}+)/iu.exec(
      message,
    );
  const last =
    /\b(?:change|update|set)\s+(?:my\s+)?last\s*name\s+to\s+(\p{L}+)/iu.exec(
      message,
    );

  if (first || last) {
    return {
      firstName: first?.[1],
      lastName: last?.[1],
    };
  }

  return null;
}
