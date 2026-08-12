import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  audienceAllows,
  matchesAny,
} from '../application-provider.types';

type FaqSummary = {
  question: string;
  answer: string;
  tags: string[];
};

@Injectable()
export class FaqKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'faq';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(faq|faqs|frequently asked|help|how do i|how can i|support)\b/i,
      /\b(aide|comment|assistance|question fréquente)\b/i,
    ]);
  }

  async retrieve(
    question: string,
    user: ApplicationUserContext,
  ): Promise<FaqSummary[]> {
    const faqs = await this.prisma.faq.findMany({
      where: { isPublished: true },
      take: 40,
      orderBy: { updatedAt: 'desc' },
    });

    const visible = faqs.filter((faq) =>
      audienceAllows(faq.audience, user.role),
    );

    const tokens = tokenize(question);
    const ranked = visible
      .map((faq) => {
        const haystack =
          `${faq.question} ${faq.answer} ${faq.tags.join(' ')}`.toLowerCase();
        const score = tokens.reduce(
          (total, token) => total + (haystack.includes(token) ? 1 : 0),
          0,
        );
        return { faq, score };
      })
      .filter((row) => row.score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ faq }) => ({
        question: faq.question,
        answer: truncate(faq.answer, 360),
        tags: faq.tags,
      }));

    return ranked;
  }

  formatContext(data: unknown): string {
    const rows = data as FaqSummary[];
    if (!rows.length) {
      return 'FAQs: no matching FAQs for this role/question.';
    }

    return [
      'FAQs:',
      ...rows.map(
        (faq, index) =>
          `${index + 1}. Q: ${faq.question}\n   A: ${faq.answer}` +
          (faq.tags.length ? `\n   Tags: ${faq.tags.join(', ')}` : ''),
      ),
    ].join('\n');
  }
}

function tokenize(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 8);
}

function truncate(value: string, max: number) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
