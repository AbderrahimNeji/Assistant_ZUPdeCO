import { UserRole } from '@prisma/client';

export type ApplicationUserContext = {
  userId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
};

/**
 * Enterprise application-data provider.
 * Register new providers in the application provider registry only.
 */
export interface ApplicationKnowledgeProvider {
  readonly id: string;

  /** Fast routing gate — no DB I/O. */
  canHandle(question: string, user: ApplicationUserContext): boolean;

  /**
   * Fetch authorized, structured records for the LLM.
   * Must enforce the same ownership / role rules as the application.
   */
  retrieve(question: string, user: ApplicationUserContext): Promise<unknown>;

  /** Turn structured records into a concise context block. */
  formatContext(data: unknown): string;
}

export function matchesAny(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

export function audienceAllows(audience: string[], role: UserRole): boolean {
  if (!audience.length) return true;
  return audience.includes(role) || audience.includes('ALL');
}

export function isStaff(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.COORDINATOR ||
    role === UserRole.TUTOR
  );
}
