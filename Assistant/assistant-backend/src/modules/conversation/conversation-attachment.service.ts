import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

const MAX_ATTACHMENTS_PER_CONVERSATION = 20;
const MAX_ATTACHMENT_CHARS = 200_000;

export type CreateConversationAttachmentInput = {
  name: string;
  text: string;
  mimeType?: string | null;
  size?: number | null;
};

@Injectable()
export class ConversationAttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(conversationId: string, userId: string) {
    await this.assertConversationOwnership(conversationId, userId);

    return this.prisma.conversationAttachment.findMany({
      where: { conversationId, userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(
    conversationId: string,
    userId: string,
    input: CreateConversationAttachmentInput,
  ) {
    await this.assertConversationOwnership(conversationId, userId);

    const count = await this.prisma.conversationAttachment.count({
      where: { conversationId, userId },
    });

    if (count >= MAX_ATTACHMENTS_PER_CONVERSATION) {
      throw new BadRequestException(
        `A conversation can have at most ${MAX_ATTACHMENTS_PER_CONVERSATION} attachments.`,
      );
    }

    const name = input.name.trim();
    const text = input.text.trim();

    if (!name || !text) {
      throw new BadRequestException('Attachment name and text are required.');
    }

    return this.prisma.conversationAttachment.create({
      data: {
        conversationId,
        userId,
        name: name.slice(0, 255),
        mimeType: input.mimeType ?? null,
        size: input.size ?? null,
        text:
          text.length > MAX_ATTACHMENT_CHARS
            ? `${text.slice(0, MAX_ATTACHMENT_CHARS)}\n\n…(truncated)`
            : text,
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createMany(
    conversationId: string,
    userId: string,
    inputs: CreateConversationAttachmentInput[],
  ) {
    const created: Array<{
      id: string;
      name: string;
      mimeType: string | null;
      size: number | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    for (const input of inputs) {
      created.push(await this.create(conversationId, userId, input));
    }
    return created;
  }

  async remove(conversationId: string, attachmentId: string, userId: string) {
    const existing = await this.prisma.conversationAttachment.findFirst({
      where: { id: attachmentId, userId, conversationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Attachment not found');
    }

    await this.prisma.conversationAttachment.delete({
      where: { id: existing.id },
    });

    return { success: true, id: existing.id };
  }

  async replace(
    conversationId: string,
    attachmentId: string,
    userId: string,
    input: CreateConversationAttachmentInput,
  ) {
    const existing = await this.prisma.conversationAttachment.findFirst({
      where: { id: attachmentId, userId, conversationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Attachment not found');
    }

    const name = input.name.trim();
    const text = input.text.trim();

    if (!name || !text) {
      throw new BadRequestException('Attachment name and text are required.');
    }

    return this.prisma.conversationAttachment.update({
      where: { id: existing.id },
      data: {
        name: name.slice(0, 255),
        mimeType: input.mimeType ?? null,
        size: input.size ?? null,
        text:
          text.length > MAX_ATTACHMENT_CHARS
            ? `${text.slice(0, MAX_ATTACHMENT_CHARS)}\n\n…(truncated)`
            : text,
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async assertConversationOwnership(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation "${conversationId}" was not found`,
      );
    }
  }
}
