import { Injectable, Logger } from '@nestjs/common';

import { buildHandlersFromRegistry } from './small-talk.handlers';
import { normalizeSmallTalkInput } from './small-talk.normalize';
import { SMALL_TALK_INTENT_REGISTRY } from './small-talk.registry';
import type {
  SmallTalkHandler,
  SmallTalkIntentDefinition,
  SmallTalkLanguage,
  SmallTalkMatch,
  SmallTalkMatchOptions,
} from './small-talk.types';

/**
 * Conversational short-circuit — no LLM, RAG, or tools.
 * Language-aware replies with light consecutive-response memory.
 */
@Injectable()
export class SmallTalkService {
  private readonly logger = new Logger(SmallTalkService.name);
  private handlers: SmallTalkHandler[];
  private activeConversationId: string | undefined;

  /** conversationId:intent:lang → last reply text */
  private readonly lastReplies = new Map<string, string>();
  /** conversationId → sticky small-talk language */
  private readonly conversationLanguage = new Map<string, SmallTalkLanguage>();

  constructor() {
    this.handlers = buildHandlersFromRegistry(SMALL_TALK_INTENT_REGISTRY, {
      getPrevious: (intentId, lang) => {
        if (!this.activeConversationId) return null;
        return (
          this.lastReplies.get(
            this.memoryKey(this.activeConversationId, intentId, lang),
          ) ?? null
        );
      },
      remember: (intentId, lang, answer) => {
        if (!this.activeConversationId) return;
        this.lastReplies.set(
          this.memoryKey(this.activeConversationId, intentId, lang),
          answer,
        );
      },
    });
  }

  register(handler: SmallTalkHandler): void {
    this.handlers.push(handler);
  }

  registerDefinition(definition: SmallTalkIntentDefinition): void {
    this.handlers.push(
      ...buildHandlersFromRegistry([definition], {
        getPrevious: (intentId, lang) => {
          if (!this.activeConversationId) return null;
          return (
            this.lastReplies.get(
              this.memoryKey(this.activeConversationId, intentId, lang),
            ) ?? null
          );
        },
        remember: (intentId, lang, answer) => {
          if (!this.activeConversationId) return;
          this.lastReplies.set(
            this.memoryKey(this.activeConversationId, intentId, lang),
            answer,
          );
        },
      }),
    );
  }

  match(
    message: string,
    options?: SmallTalkMatchOptions,
  ): SmallTalkMatch | null {
    const original = message.trim();
    if (!original) return null;
    if (original.length > 160) return null;

    const normalized = normalizeSmallTalkInput(original);
    if (!normalized) return null;
    if (looksLikeKnowledgeOrAction(normalized)) return null;

    const preferredLanguage =
      options?.preferredLanguage ??
      (options?.conversationId
        ? this.conversationLanguage.get(options.conversationId)
        : undefined);

    this.activeConversationId = options?.conversationId;
    try {
      for (const handler of this.handlers) {
        const hit = handler.match(normalized, original, {
          ...options,
          preferredLanguage,
        });
        if (hit) {
          if (options?.conversationId) {
            this.conversationLanguage.set(options.conversationId, hit.language);
          }
          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(
              `small_talk intent=${hit.intent} lang=${hit.language} normalized="${normalized}"`,
            );
          }
          return hit;
        }
      }
    } finally {
      this.activeConversationId = undefined;
    }

    return null;
  }

  isSmallTalk(message: string, options?: SmallTalkMatchOptions): boolean {
    return this.match(message, options) !== null;
  }

  /** Map LanguageService labels → small-talk language codes. */
  static fromLanguageLabel(
    label?: string | null,
  ): SmallTalkLanguage | undefined {
    const value = label?.trim().toLowerCase();
    if (!value) return undefined;
    if (value.startsWith('fr')) return 'fr';
    if (value.startsWith('es') || value.startsWith('sp')) return 'es';
    if (value.startsWith('ar')) return 'ar';
    if (value.startsWith('en')) return 'en';
    return undefined;
  }

  private memoryKey(
    conversationId: string,
    intentId: string,
    lang: SmallTalkLanguage,
  ) {
    return `${conversationId}:${intentId}:${lang}`;
  }
}

function looksLikeKnowledgeOrAction(normalized: string): boolean {
  if (normalized.split(' ').length > 8) return true;

  return (
    /\b(enroll|enrol|course|courses|document|documents|tutor|registration|timetable|syllabus|deadline|policy|faq|benchmark)\b/.test(
      normalized,
    ) ||
    /\b(cours|documents?|tuteur|inscription|emploi du temps|syllabus|politique)\b/.test(
      normalized,
    ) ||
    /\b(curso|cursos|documento|tutor|inscripcion|horario)\b/.test(normalized)
  );
}
