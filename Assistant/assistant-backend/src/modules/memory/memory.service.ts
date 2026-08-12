import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { ToolActionButton } from '../actions/tool.types';
import type { ExecutionTrace } from '../assistant/execution-trace.types';
import type { SuggestedAction } from '../assistant/suggestions/suggestion.types';
import type { ChatSourceAttribution } from '../knowledge/source-attribution';

export type StoredMessageActions = {
  status?: string;
  toolId?: string;
  confirmationId?: string;
  buttons?: ToolActionButton[];
};

export type MessageTreeFields = {
  parentMessageId?: string | null;
  branchId: string;
  version: number;
};

export type TurnTreeContext = {
  /** Parent for the assistant message (usually the user turn id). */
  assistantParentId: string;
  branchId: string;
  assistantVersion: number;
  userMessageId: string | null;
  activeBranchId: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  parentMessageId: string | null;
  branchId: string;
  version: number;
  createdAt: Date;
};

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(
    conversationId: string,
    role: string,
    content: string,
    sources?: ChatSourceAttribution[],
    actions?: StoredMessageActions,
    executionTrace?: ExecutionTrace,
    suggestedActions?: SuggestedAction[],
    tree?: MessageTreeFields,
  ) {
    const hasActions = Boolean(
      actions?.buttons?.length || actions?.confirmationId || actions?.status,
    );

    const branchId = tree?.branchId ?? randomUUID();
    const version = tree?.version ?? 1;

    return this.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        parentMessageId: tree?.parentMessageId ?? null,
        branchId,
        version,
        ...(sources?.length ? { sources } : {}),
        ...(hasActions && actions
          ? { actions: actions as unknown as Prisma.InputJsonValue }
          : {}),
        ...(executionTrace
          ? {
              executionTrace: executionTrace,
            }
          : {}),
        ...(suggestedActions?.length
          ? {
              suggestedActions:
                suggestedActions as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }

  async setActivePath(
    conversationId: string,
    activeBranchId: string,
    activeLeafId: string,
  ) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        activeBranchId,
        activeLeafId,
        updatedAt: new Date(),
      },
    });
  }

  async getConversationMeta(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        activeBranchId: true,
        activeLeafId: true,
      },
    });
  }

  async getAllMessages(conversationId: string): Promise<MessageRow[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        role: true,
        content: true,
        parentMessageId: true,
        branchId: true,
        version: true,
        createdAt: true,
      },
    });
  }

  /**
   * Walk leaf → root for the active path (or provided leaf).
   */
  buildPathToRoot(
    messages: MessageRow[],
    leafId: string | null | undefined,
  ): MessageRow[] {
    if (!messages.length) return [];

    const byId = new Map(messages.map((message) => [message.id, message]));
    const leaf =
      (leafId ? byId.get(leafId) : undefined) ?? messages[messages.length - 1];

    if (!leaf) return [];

    const path: MessageRow[] = [];
    const seen = new Set<string>();
    let current: MessageRow | undefined = leaf;

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.push(current);
      current = current.parentMessageId
        ? byId.get(current.parentMessageId)
        : undefined;
    }

    return path.reverse();
  }

  async getRecentMessages(
    conversationId: string,
    limit = 10,
    leafId?: string | null,
  ) {
    if (limit <= 0) {
      return [];
    }

    const meta = await this.getConversationMeta(conversationId);
    const all = await this.getAllMessages(conversationId);
    const path = this.buildPathToRoot(all, leafId ?? meta?.activeLeafId);

    const recent = path.slice(-limit);
    return recent.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }));
  }

  async getConversationHistory(conversationId: string) {
    return this.prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async nextChildVersion(
    parentMessageId: string | null,
    conversationId: string,
  ) {
    const where =
      parentMessageId === null
        ? { conversationId, parentMessageId: null }
        : { parentMessageId };

    const aggregate = await this.prisma.message.aggregate({
      where,
      _max: { version: true },
    });

    return (aggregate._max.version ?? 0) + 1;
  }

  /**
   * Prepare tree links for a chat turn (normal / edit / regenerate).
   * Does not change planner / RAG — only message placement.
   */
  async beginTurn(input: {
    conversationId: string;
    content: string;
    regenerate?: boolean;
    editMessageId?: string;
    /** User message id that owns assistant siblings (regenerate). */
    parentMessageId?: string;
  }): Promise<TurnTreeContext> {
    const meta = await this.getConversationMeta(input.conversationId);
    if (!meta) {
      throw new NotFoundException('Conversation not found');
    }

    // ——— Regenerate: sibling assistant under the same user message ———
    if (input.regenerate) {
      const parentId = input.parentMessageId;
      if (!parentId) {
        throw new BadRequestException(
          'parentMessageId is required when regenerating',
        );
      }

      const parent = await this.prisma.message.findFirst({
        where: { id: parentId, conversationId: input.conversationId },
      });
      if (!parent || parent.role !== 'user') {
        throw new BadRequestException(
          'Regenerate parent must be a user message',
        );
      }

      const assistantVersion = await this.nextChildVersion(
        parent.id,
        input.conversationId,
      );

      return {
        assistantParentId: parent.id,
        branchId: parent.branchId,
        assistantVersion,
        userMessageId: parent.id,
        activeBranchId: parent.branchId,
      };
    }

    // ——— Edit: sibling user message + new branch ———
    if (input.editMessageId) {
      const original = await this.prisma.message.findFirst({
        where: {
          id: input.editMessageId,
          conversationId: input.conversationId,
        },
      });
      if (!original || original.role !== 'user') {
        throw new BadRequestException('Only user messages can be edited');
      }

      const branchId = randomUUID();
      const version = await this.nextChildVersion(
        original.parentMessageId,
        input.conversationId,
      );

      const userMessage = await this.saveMessage(
        input.conversationId,
        'user',
        input.content,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          parentMessageId: original.parentMessageId,
          branchId,
          version,
        },
      );

      return {
        assistantParentId: userMessage.id,
        branchId,
        assistantVersion: 1,
        userMessageId: userMessage.id,
        activeBranchId: branchId,
      };
    }

    // ——— Normal append on active leaf ———
    const all = await this.getAllMessages(input.conversationId);
    const leaf = meta.activeLeafId
      ? all.find((message) => message.id === meta.activeLeafId)
      : all[all.length - 1];

    const parentMessageId = leaf?.id ?? null;
    const branchId = leaf?.branchId ?? randomUUID();
    const version = await this.nextChildVersion(
      parentMessageId,
      input.conversationId,
    );

    const userMessage = await this.saveMessage(
      input.conversationId,
      'user',
      input.content,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        parentMessageId,
        branchId,
        version,
      },
    );

    return {
      assistantParentId: userMessage.id,
      branchId,
      assistantVersion: 1,
      userMessageId: userMessage.id,
      activeBranchId: branchId,
    };
  }

  /**
   * Resolve which leaf to activate for a branch or explicit message.
   */
  async resolveLeafForActivation(input: {
    conversationId: string;
    branchId?: string;
    leafMessageId?: string;
  }): Promise<{ activeBranchId: string; activeLeafId: string }> {
    const all = await this.getAllMessages(input.conversationId);
    if (!all.length) {
      throw new BadRequestException('Conversation has no messages');
    }

    if (input.leafMessageId) {
      const target = all.find((message) => message.id === input.leafMessageId);
      if (!target) {
        throw new NotFoundException('Message not found');
      }

      // Prefer deepest descendant on the same preferred child chain:
      // if selecting a non-leaf, walk to latest child recursively by version.
      let leaf = target;
      while (true) {
        const children = all
          .filter((message) => message.parentMessageId === leaf.id)
          .sort(
            (a, b) =>
              a.version - b.version ||
              a.createdAt.getTime() - b.createdAt.getTime(),
          );
        if (!children.length) break;
        leaf = children[children.length - 1]!;
      }

      return {
        activeBranchId: leaf.branchId,
        activeLeafId: leaf.id,
      };
    }

    if (input.branchId) {
      const onBranch = all.filter(
        (message) => message.branchId === input.branchId,
      );
      if (!onBranch.length) {
        throw new NotFoundException('Branch not found');
      }

      // Latest message on this branch that has no child on the same branch,
      // else overall latest on branch.
      const ids = new Set(onBranch.map((message) => message.id));
      const leaves = onBranch.filter(
        (message) =>
          !all.some(
            (child) =>
              child.parentMessageId === message.id && ids.has(child.id),
          ),
      );
      const leaf =
        leaves.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        )[0] ?? onBranch[onBranch.length - 1];

      return {
        activeBranchId: leaf.branchId,
        activeLeafId: leaf.id,
      };
    }

    throw new BadRequestException('branchId or leafMessageId is required');
  }
}
