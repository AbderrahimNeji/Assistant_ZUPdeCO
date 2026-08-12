import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  matchesAny,
} from '../application-provider.types';

type ProfileRow = {
  fullName: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class UserProfileKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'user_profile';

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(my|mine|me|i am|i'm|profil|profile|account|email|role|who am i)\b/i,
      /\b(mon|ma|mes|moi|compte|profil|rôle|role)\b/i,
    ]);
  }

  retrieve(
    _question: string,
    user: ApplicationUserContext,
  ): Promise<ProfileRow> {
    // Always scoped to the authenticated user — never another profile.
    return Promise.resolve({
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
    });
  }

  formatContext(data: unknown): string {
    const row = data as ProfileRow;
    return [
      'User profile (authenticated user only):',
      `- Name: ${row.fullName}`,
      `- Role: ${row.role}`,
    ].join('\n');
  }
}
