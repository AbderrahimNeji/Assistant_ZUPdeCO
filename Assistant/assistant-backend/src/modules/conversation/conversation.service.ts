import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { SetActiveBranchDto } from './dto/set-active-branch.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: {
        userId,
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        messages: {
          select: {
            content: true,
            branchId: true,
          },
        },
      },
    });

    return rows.map(({ messages, ...conversation }) => ({
      ...conversation,
      // Search across every branch; UI still renders only the active path.
      searchText: messages
        .map((message) => message.content)
        .join('\n')
        .slice(0, 8000),
      branchCount: new Set(messages.map((message) => message.branchId)).size,
    }));
  }

  async create(userId: string, title?: string) {
    return this.prisma.conversation.create({
      data: {
        userId,
        title: title?.trim() || 'New conversation',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const branchIds = [
      ...new Set(conversation.messages.map((message) => message.branchId)),
    ];

    return {
      ...conversation,
      branches: branchIds.map((branchId, index) => ({
        id: branchId,
        label: `Branch ${String.fromCharCode(65 + (index % 26))}`,
      })),
    };
  }

  async setActiveBranch(id: string, userId: string, dto: SetActiveBranchDto) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }

    const resolved = await this.memoryService.resolveLeafForActivation({
      conversationId: id,
      branchId: dto.branchId,
      leafMessageId: dto.leafMessageId,
    });

    await this.memoryService.setActivePath(
      id,
      resolved.activeBranchId,
      resolved.activeLeafId,
    );

    return this.findOne(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateConversationDto) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }

    if (dto.title === undefined && dto.pinned === undefined) {
      throw new BadRequestException('No updates provided');
    }

    const data: Prisma.ConversationUpdateInput = {};

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('Title cannot be empty');
      }
      data.title = title.slice(0, 120);
    }

    if (dto.pinned !== undefined) {
      data.pinned = dto.pinned;
    }

    return this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const result = await this.prisma.conversation.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Conversation not found');
    }

    return result;
  }

  async deleteAll(userId: string) {
    return this.prisma.conversation.deleteMany({
      where: {
        userId,
      },
    });
  }
}
