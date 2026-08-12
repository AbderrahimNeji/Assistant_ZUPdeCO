import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { ApplicationProviderRegistry } from '../application/application-provider.registry';
import { ApplicationUserContext } from '../application/application-provider.types';
import {
  KnowledgeRetrieveInput,
  KnowledgeSnippet,
  KnowledgeSource,
} from '../knowledge.types';

/**
 * Modular Application DB connector.
 * Routes only to relevant providers via canHandle(), enforces auth in each provider,
 * and returns structured summaries (not raw rows).
 */
@Injectable()
export class ApplicationKnowledgeSource implements KnowledgeSource {
  readonly id = 'application_db' as const;
  private readonly logger = new Logger(ApplicationKnowledgeSource.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ApplicationProviderRegistry,
  ) {}

  async retrieve(input: KnowledgeRetrieveInput): Promise<KnowledgeSnippet[]> {
    const user = await this.loadUserContext(input.userId);
    if (!user) {
      return [];
    }

    const selected = this.registry.providers.filter((provider) =>
      provider.canHandle(input.query, user),
    );

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `routed providers query="${input.query}" selected=[${selected
          .map((provider) => provider.id)
          .join(', ')}] skipped=[${this.registry.providers
          .filter((provider) => !selected.includes(provider))
          .map((provider) => provider.id)
          .join(', ')}]`,
      );
    }

    if (!selected.length) {
      return [];
    }

    const settled = await Promise.all(
      selected.map(async (provider): Promise<KnowledgeSnippet | null> => {
        try {
          const data = await provider.retrieve(input.query, user);
          const content = provider.formatContext(data).trim();
          if (!content) {
            return null;
          }

          const bi =
            provider.id === 'business_intelligence' &&
            data &&
            typeof data === 'object'
              ? (data as {
                  businessVisual?: unknown;
                  transparency?: unknown;
                })
              : null;

          return {
            source: this.id,
            title: `application:${provider.id}`,
            content,
            score: 0.85,
            page: 1,
            providerId: provider.id,
            ...(bi?.businessVisual
              ? { businessVisual: bi.businessVisual }
              : {}),
            ...(bi?.transparency
              ? { businessTransparency: bi.transparency }
              : {}),
          };
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(
              `provider failed id=${provider.id} error=${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
          return null;
        }
      }),
    );

    return settled.filter(
      (snippet): snippet is KnowledgeSnippet => snippet !== null,
    );
  }

  private async loadUserContext(
    userId: string,
  ): Promise<ApplicationUserContext | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) return null;

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }
}
