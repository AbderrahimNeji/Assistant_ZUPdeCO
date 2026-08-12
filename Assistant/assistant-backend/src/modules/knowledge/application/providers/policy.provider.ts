import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  audienceAllows,
  matchesAny,
} from '../application-provider.types';

type PolicySummary = {
  title: string;
  summary: string;
};

@Injectable()
export class PolicyKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'policy';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(policy|policies|rule|rules|guideline|guidelines|terms|privacy|gdpr)\b/i,
      /\b(politique|règlement|reglement|confidentialité|confidentialite)\b/i,
    ]);
  }

  async retrieve(
    question: string,
    user: ApplicationUserContext,
  ): Promise<PolicySummary[]> {
    const policies = await this.prisma.policy.findMany({
      where: { isPublished: true },
      take: 30,
      orderBy: { updatedAt: 'desc' },
    });

    const visible = policies.filter((policy) =>
      audienceAllows(policy.audience, user.role),
    );

    const tokens = question
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 3);

    const ranked = visible
      .map((policy) => {
        const haystack =
          `${policy.title} ${policy.summary} ${policy.content}`.toLowerCase();
        const score = tokens.reduce(
          (total, token) => total + (haystack.includes(token) ? 1 : 0),
          0,
        );
        return { policy, score };
      })
      .filter((row) => row.score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ policy }) => ({
        title: policy.title,
        summary: truncate(policy.summary || policy.content, 320),
      }));

    return ranked;
  }

  formatContext(data: unknown): string {
    const rows = data as PolicySummary[];
    if (!rows.length) {
      return 'Policies: no matching policies for this role/question.';
    }

    return [
      'Policies:',
      ...rows.map(
        (policy, index) =>
          `${index + 1}. ${policy.title}\n   ${policy.summary}`,
      ),
    ].join('\n');
  }
}

function truncate(value: string, max: number) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
