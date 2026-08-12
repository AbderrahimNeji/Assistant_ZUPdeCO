import { Injectable } from '@nestjs/common';

import { ConversationService } from '../../conversation/conversation.service';
import { DocumentsService } from '../../documents/documents.service';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  asString,
  matchesAny,
} from '../tool.types';

@Injectable()
export class DocumentTool implements ApplicationTool {
  readonly id = 'document';
  readonly description =
    'List or delete the user’s knowledge-base documents; certificate download stub';

  constructor(
    private readonly documents: DocumentsService,
    private readonly conversations: ConversationService,
  ) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(my documents|list documents|show documents)\b/i,
      /\b(delete|remove)\b.*\b(document|file)\b/i,
      /\b(download|get)\b.*\b(certificate|certificat)\b/i,
      /\b(delete|clear)\b.*\b(conversation|chat)\b/i,
    ]);
  }

  async validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    if (matchesAny(input.rawMessage, [/\bcertificate|certificat\b/i])) {
      return {
        ok: false,
        error:
          'Certificates are not available for download yet. Complete your program requirements first, then ask your coordinator.',
        recoveryActions: [
          {
            id: 'list_registrations',
            label: 'Show my registrations',
            toolId: 'registration',
            style: 'secondary',
          },
        ],
      };
    }

    if (
      input.actionId === 'delete_document' ||
      matchesAny(input.rawMessage, [
        /\b(delete|remove)\b.*\b(document|file)\b/i,
      ])
    ) {
      const documentId =
        typeof input.payload?.documentId === 'string'
          ? input.payload.documentId
          : undefined;

      const docs = await this.documents.findAll(user.userId);

      if (documentId) {
        const doc = docs.find((item) => item.id === documentId);
        if (!doc) {
          return {
            ok: false,
            error: 'Document not found or not owned by you.',
          };
        }

        if (input.payload?.confirmed) {
          return { ok: true, payload: { documentId, name: doc.name } };
        }

        return {
          ok: true,
          confirmation: {
            summary: [
              'Je peux supprimer ce document :',
              `• Nom : ${doc.name}`,
              '',
              'Confirmez pour appeler l’API. Cette action est irréversible.',
            ].join('\n'),
            payload: { documentId, name: doc.name },
            preview: {
              title: 'Suppression de document',
              entities: [{ type: 'document', label: doc.name }],
              warnings: ['Suppression définitive du fichier et de son index.'],
            },
          },
        };
      }

      if (!docs.length) {
        return { ok: false, error: 'You have no documents to delete.' };
      }

      return {
        ok: true,
        proposal: {
          message: 'Which document should I delete?',
          actions: docs.slice(0, 6).map((doc) => ({
            id: 'delete_document',
            label: `Delete · ${doc.name}`,
            toolId: this.id,
            style: 'destructive' as const,
            requiresConfirmation: true,
            payload: { documentId: doc.id },
          })),
        },
      };
    }

    if (
      input.actionId === 'delete_conversation' ||
      matchesAny(input.rawMessage, [
        /\b(delete|clear)\b.*\b(this )?(conversation|chat)\b/i,
      ])
    ) {
      if (input.payload?.confirmed) {
        return {
          ok: true,
          payload: { conversationId: input.conversationId },
        };
      }

      return {
        ok: true,
        confirmation: {
          summary: 'I can delete this conversation. Continue?',
          payload: { conversationId: input.conversationId },
        },
      };
    }

    return { ok: true, payload: { list: true } };
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    if (input.actionId === 'delete_document') {
      const documentId = asString(input.payload?.documentId);
      await this.documents.delete(documentId, user.userId);
      return { deleted: true, name: input.payload?.name };
    }

    if (input.actionId === 'delete_conversation') {
      await this.conversations.delete(input.conversationId, user.userId);
      return {
        deletedConversation: true,
        conversationId: input.conversationId,
      };
    }

    return this.documents.findAll(user.userId);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (status === 'executed') {
      const row = data as {
        deleted?: boolean;
        name?: string;
        deletedConversation?: boolean;
      };
      if (row.deletedConversation) {
        return 'Conversation deleted.';
      }
      if (row.deleted) {
        return `Deleted document “${row.name ?? 'file'}”.`;
      }
    }

    const rows = data as Array<{ name: string; status: string }>;
    if (!rows?.length) {
      return 'You have no knowledge-base documents yet.';
    }

    return [
      'Your documents:',
      ...rows.map((doc, index) => `${index + 1}. ${doc.name} [${doc.status}]`),
    ].join('\n');
  }
}
