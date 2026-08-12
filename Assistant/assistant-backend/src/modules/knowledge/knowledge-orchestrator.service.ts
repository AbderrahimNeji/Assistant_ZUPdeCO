import { Injectable, Logger } from '@nestjs/common';

import { SensitiveDataRedactor } from '../../common/security/sensitive-data-redactor';
import { QuestionRouterService } from './documentation/question-router.service';
import { DocumentationKnowledgeSource } from './documentation/documentation-knowledge.source';
import { ApplicationKnowledgeSource } from './sources/application-knowledge.source';
import { ConversationAttachmentKnowledgeSource } from './sources/conversation-attachment.source';
import { DocumentKnowledgeSource } from './sources/document-knowledge.source';
import {
  KnowledgeRetrieveInput,
  KnowledgeSnippet,
  KnowledgeSource,
  KnowledgeSourceId,
} from './knowledge.types';

export type KnowledgeRetrievalResult = {
  snippets: KnowledgeSnippet[];
  context: string;
  bySource: Record<KnowledgeSourceId, KnowledgeSnippet[]>;
  /** Application DB provider ids that contributed snippets (observability). */
  providersUsed: string[];
  /** Routed question intent for observability. */
  routeIntent?: string;
};

@Injectable()
export class KnowledgeOrchestratorService {
  private readonly logger = new Logger(KnowledgeOrchestratorService.name);
  private readonly sourcesById: Map<KnowledgeSourceId, KnowledgeSource>;

  constructor(
    conversationAttachments: ConversationAttachmentKnowledgeSource,
    documentKb: DocumentKnowledgeSource,
    documentationKb: DocumentationKnowledgeSource,
    applicationDb: ApplicationKnowledgeSource,
    private readonly questionRouter: QuestionRouterService,
  ) {
    this.sourcesById = new Map<KnowledgeSourceId, KnowledgeSource>([
      [conversationAttachments.id, conversationAttachments],
      [documentKb.id, documentKb],
      [documentationKb.id, documentationKb],
      [applicationDb.id, applicationDb],
    ]);
  }

  async retrieve(
    input: KnowledgeRetrieveInput,
  ): Promise<KnowledgeRetrievalResult> {
    const route = this.questionRouter.route(input.query);

    const enabled: KnowledgeSourceId[] = [];
    if (route.useAttachments) enabled.push('conversation_attachments');
    if (route.useDocumentation) enabled.push('documentation_kb');
    if (route.useUserDocuments) enabled.push('document_kb');
    if (route.useBusiness) enabled.push('application_db');

    const settled = await Promise.all(
      enabled.map(async (id) => {
        const source = this.sourcesById.get(id);
        if (!source) {
          return { id, snippets: [] as KnowledgeSnippet[] };
        }
        return {
          id,
          snippets: await source.retrieve(input),
        };
      }),
    );

    const bySource: Record<KnowledgeSourceId, KnowledgeSnippet[]> = {
      conversation_attachments: [],
      document_kb: [],
      documentation_kb: [],
      application_db: [],
    };

    for (const result of settled) {
      bySource[result.id] = result.snippets;
    }

    const snippets = settled.flatMap((result) => result.snippets);
    const providersUsed = [
      ...new Set(
        bySource.application_db
          .map((snippet) => snippet.providerId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const context = this.formatContext(bySource);

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `knowledge route=${route.intent} providers used=[${[
          ...settled
            .filter((result) => result.snippets.length > 0)
            .map((result) => result.id),
          ...providersUsed.map((id) => `application:${id}`),
        ].join(', ')}] query="${input.query}"`,
      );
    }

    return {
      snippets,
      context,
      bySource,
      providersUsed,
      routeIntent: route.intent,
    };
  }

  private formatContext(
    bySource: Record<KnowledgeSourceId, KnowledgeSnippet[]>,
  ): string {
    const sections: string[] = [];

    if (bySource.conversation_attachments.length) {
      sections.push(
        [
          '### Conversation attachments',
          ...bySource.conversation_attachments.map(
            (snippet) =>
              `--- Attached file: ${snippet.title} ---\n${snippet.content}`,
          ),
        ].join('\n\n'),
      );
    }

    if (bySource.documentation_kb.length) {
      sections.push(
        [
          '### Product knowledge (answer from this; never cite as a source)',
          ...bySource.documentation_kb.map((snippet) => snippet.content),
        ].join('\n\n'),
      );
    }

    if (bySource.document_kb.length) {
      sections.push(
        [
          '### Indexed knowledge base',
          ...bySource.document_kb.map(
            (snippet) =>
              `--- Document: ${snippet.title} (page ${snippet.page ?? 1}) ---\n${snippet.content}`,
          ),
        ].join('\n\n'),
      );
    }

    if (bySource.application_db.length) {
      sections.push(
        [
          '### Live application / business intelligence facts',
          ...bySource.application_db.map(
            (snippet) => `--- ${snippet.title} ---\n${snippet.content}`,
          ),
        ].join('\n\n'),
      );
    }

    return SensitiveDataRedactor.redact(sections.join('\n\n'));
  }
}
