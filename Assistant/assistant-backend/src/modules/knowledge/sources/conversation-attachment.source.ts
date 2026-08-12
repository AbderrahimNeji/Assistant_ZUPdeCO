import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  UNTRUSTED_MAX,
  sanitizeUntrusted,
  wrapUntrusted,
} from '../../../common/security/untrusted-text';
import {
  KnowledgeRetrieveInput,
  KnowledgeSnippet,
  KnowledgeSource,
} from '../knowledge.types';

/**
 * Conversation-scoped uploaded files (not permanently indexed).
 */
@Injectable()
export class ConversationAttachmentKnowledgeSource implements KnowledgeSource {
  readonly id = 'conversation_attachments' as const;

  constructor(private readonly prisma: PrismaService) {}

  async retrieve(input: KnowledgeRetrieveInput): Promise<KnowledgeSnippet[]> {
    const attachments = await this.prisma.conversationAttachment.findMany({
      where: {
        conversationId: input.conversationId,
        userId: input.userId,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        text: true,
      },
    });

    return attachments
      .filter((attachment) => attachment.text.trim().length > 0)
      .map((attachment) => ({
        source: this.id,
        title: sanitizeUntrusted(attachment.name, UNTRUSTED_MAX.title),
        content: wrapUntrusted(
          'attachment',
          attachment.text.trim(),
          UNTRUSTED_MAX.attachment,
        ),
        score: 1,
        page: 1,
      }));
  }
}
