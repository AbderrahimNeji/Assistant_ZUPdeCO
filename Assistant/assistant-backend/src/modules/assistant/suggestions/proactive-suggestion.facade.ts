import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContextStore } from '../../integration/request-context';
import type { ExecutionTrace } from '../execution-trace.types';
import type { ChatSourceAttribution } from '../../knowledge/source-attribution';
import { SuggestionService } from './suggestion.service';
import type { SuggestedAction } from './suggestion.types';

@Injectable()
export class ProactiveSuggestionFacade {
  constructor(
    private readonly suggestions: SuggestionService,
    private readonly prisma: PrismaService,
  ) {}

  async build(input: {
    conversationId: string;
    question: string;
    answer: string;
    executionTrace: ExecutionTrace;
    sources?: ChatSourceAttribution[];
  }): Promise<SuggestedAction[]> {
    const previousIds = await this.loadPreviousSuggestionIds(
      input.conversationId,
    );
    const appCtx = RequestContextStore.getApplicationContext();
    const focusedEntityKinds = [
      appCtx?.student ? 'student' : null,
      appCtx?.tutor ? 'tutor' : null,
      appCtx?.session ? 'session' : null,
      appCtx?.report ? 'report' : null,
      appCtx?.matching ? 'matching' : null,
      appCtx?.program ? 'program' : null,
      appCtx?.document ? 'document' : null,
      appCtx?.selection?.primary?.type ?? null,
    ].filter((v): v is string => Boolean(v));

    return this.suggestions.generate({
      question: input.question,
      answer: input.answer,
      plannerMode: input.executionTrace.planner.mode,
      plannerTools: input.executionTrace.planner.selectedTools.map(
        (tool) => tool.id,
      ),
      knowledgeProviders: input.executionTrace.knowledge.applicationDbProviders,
      conversationAttachmentCount:
        input.executionTrace.knowledge.conversationAttachments,
      documentKbCount: input.executionTrace.knowledge.documentKb,
      executedToolIds: input.executionTrace.toolExecution.map(
        (item) => item.toolId,
      ),
      toolStatus: input.executionTrace.toolExecution.at(-1)?.status,
      sourceTitles: (input.sources ?? []).map((source) => source.label),
      previousSuggestionIds: previousIds,
      pageRoute: appCtx?.page?.route,
      pageInterfaceId: appCtx?.page?.interfaceId,
      pageTitle: appCtx?.page?.title,
      selectionType: appCtx?.selection?.primary?.type,
      selectionLabel:
        appCtx?.selection?.primary?.label ||
        appCtx?.student?.label ||
        appCtx?.tutor?.label ||
        appCtx?.session?.label ||
        appCtx?.report?.label,
      focusedEntityKinds,
    });
  }

  private async loadPreviousSuggestionIds(
    conversationId: string,
  ): Promise<string[]> {
    const previous = await this.prisma.message.findFirst({
      where: { conversationId, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
      select: { suggestedActions: true },
    });

    const raw = previous?.suggestedActions;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) =>
        item && typeof item === 'object' && 'id' in item
          ? String((item as { id: unknown }).id)
          : '',
      )
      .filter(Boolean);
  }
}
