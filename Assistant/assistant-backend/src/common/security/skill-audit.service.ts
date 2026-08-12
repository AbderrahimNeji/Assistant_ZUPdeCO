import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type SkillAuditInput = {
  type?: string;
  userId?: string;
  companyId?: string;
  skillId?: string;
  toolId?: string;
  requestId?: string;
  success?: boolean;
  meta?: Record<string, unknown>;
};

/**
 * Audit log for sensitive Business Skill / tool calls.
 * Stores metadata only — never raw payloads, tokens, or PII blobs.
 */
@Injectable()
export class SkillAuditService {
  private readonly logger = new Logger(SkillAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: SkillAuditInput): Promise<void> {
    const type = input.type || 'skill_call';
    const meta = sanitizeMeta(input.meta);

    this.logger.log(
      JSON.stringify({
        event: 'security_audit',
        type,
        userId: input.userId,
        companyId: input.companyId,
        skillId: input.skillId,
        toolId: input.toolId,
        requestId: input.requestId,
        success: input.success !== false,
      }),
    );

    try {
      await this.prisma.securityAuditEvent.create({
        data: {
          type,
          userId: input.userId,
          companyId: input.companyId,
          skillId: input.skillId,
          toolId: input.toolId,
          requestId: input.requestId,
          success: input.success !== false,
          ...(meta ? { meta: meta as Prisma.InputJsonValue } : {}),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist security audit event: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}

const ALLOWED_META = new Set([
  'action',
  'entityType',
  'entityCount',
  'routeIntent',
  'statusCode',
  'durationMs',
  'reason',
]);

function sanitizeMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!ALLOWED_META.has(key)) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      clean[key] = typeof value === 'string' ? value.slice(0, 120) : value;
    }
  }
  return Object.keys(clean).length ? clean : undefined;
}
