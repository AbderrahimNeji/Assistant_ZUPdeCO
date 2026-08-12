import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackRating, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { EVALUATION_EVENT_TYPES } from './evaluation.types';
import { FailureDetectionService } from './failure-detection.service';
import { TurnMetricsService } from './turn-metrics.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly failures: FailureDetectionService,
    private readonly turnMetrics: TurnMetricsService,
  ) {}

  async submitFeedback(input: {
    userId: string;
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
    categories?: string[];
  }) {
    const message = await this.prisma.message.findUnique({
      where: { id: input.messageId },
      include: {
        conversation: { select: { id: true, userId: true } },
      },
    });

    if (!message || message.role !== 'assistant') {
      throw new NotFoundException('Assistant message not found');
    }

    if (message.conversation.userId !== input.userId) {
      throw new ForbiddenException('You cannot rate this message');
    }

    const comment = input.comment?.trim() || null;
    const categories = sanitizeCategories(input.categories);

    const feedback = await this.prisma.messageFeedback.upsert({
      where: {
        messageId_userId: {
          messageId: input.messageId,
          userId: input.userId,
        },
      },
      create: {
        messageId: input.messageId,
        conversationId: message.conversationId,
        userId: input.userId,
        rating: input.rating,
        comment,
        categories,
      },
      update: {
        rating: input.rating,
        comment,
        categories,
      },
    });

    await this.prisma.evaluationEvent.create({
      data: {
        type: EVALUATION_EVENT_TYPES.FEEDBACK,
        messageId: input.messageId,
        conversationId: message.conversationId,
        userId: input.userId,
        payload: {
          rating: input.rating,
          hasComment: Boolean(comment),
          categories,
        },
      },
    });

    this.logger.log(
      JSON.stringify({
        event: 'feedback_recorded',
        messageId: input.messageId,
        conversationId: message.conversationId,
        userId: input.userId,
        rating: input.rating,
        hasComment: Boolean(comment),
        categories,
      }),
    );

    await this.failures.inspectAfterFeedback(input.rating);

    return {
      id: feedback.id,
      messageId: feedback.messageId,
      conversationId: feedback.conversationId,
      rating: feedback.rating,
      comment: feedback.comment,
      categories: feedback.categories,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }

  async listForConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const rows = await this.prisma.messageFeedback.findMany({
      where: { conversationId, userId },
      select: {
        messageId: true,
        rating: true,
        comment: true,
        categories: true,
        updatedAt: true,
      },
    });

    return Object.fromEntries(
      rows.map((row) => [
        row.messageId,
        {
          rating: row.rating,
          comment: row.comment,
          categories: row.categories,
          updatedAt: row.updatedAt,
        },
      ]),
    );
  }

  async recordEvent(input: {
    userId: string;
    type: string;
    messageId?: string;
    conversationId?: string;
    payload?: Record<string, unknown>;
  }) {
    const safePayload = sanitizeEventPayload(input.payload);

    if (input.messageId) {
      const message = await this.prisma.message.findUnique({
        where: { id: input.messageId },
        include: {
          conversation: { select: { userId: true, id: true } },
        },
      });

      if (!message || message.conversation.userId !== input.userId) {
        throw new NotFoundException('Message not found');
      }

      input.conversationId = message.conversationId;
    }

    const event = await this.prisma.evaluationEvent.create({
      data: {
        type: input.type,
        messageId: input.messageId,
        conversationId: input.conversationId,
        userId: input.userId,
        ...(safePayload
          ? { payload: safePayload as Prisma.InputJsonValue }
          : {}),
      },
    });

    if (
      input.type === EVALUATION_EVENT_TYPES.SUGGESTION_CLICK &&
      input.messageId
    ) {
      await this.turnMetrics.markSuggestionClicked(input.messageId);
    }

    if (input.type === EVALUATION_EVENT_TYPES.TOOL_ACTION && input.messageId) {
      await this.turnMetrics.markToolActionFromUi(input.messageId);
    }

    this.logger.log(
      JSON.stringify({
        event: 'evaluation_event',
        type: input.type,
        messageId: input.messageId,
        conversationId: input.conversationId,
        userId: input.userId,
      }),
    );

    return { id: event.id, type: event.type, createdAt: event.createdAt };
  }
}

const ALLOWED_PAYLOAD_KEYS = new Set([
  'suggestionId',
  'suggestionType',
  'label',
  'toolId',
  'actionId',
  'href',
  'categories',
]);

const ALLOWED_CATEGORIES = new Set([
  'incorrect',
  'missing',
  'wrong_source',
  'hallucination',
  'too_long',
  'too_short',
  'slow',
]);

function sanitizeCategories(categories?: string[]): string[] {
  if (!categories?.length) return [];
  return [
    ...new Set(
      categories
        .map((c) => c.trim().toLowerCase())
        .filter((c) => ALLOWED_CATEGORIES.has(c)),
    ),
  ].slice(0, 8);
}

function sanitizeEventPayload(
  payload?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!payload) return undefined;

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      clean[key] = typeof value === 'string' ? value.slice(0, 200) : value;
    }
  }

  return Object.keys(clean).length ? clean : undefined;
}
