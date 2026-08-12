export type SmallTalkIntent =
  | 'greeting'
  | 'gratitude'
  | 'farewell'
  | 'status'
  | 'identity'
  | 'speak_arabic';

export type SmallTalkLanguage = 'en' | 'fr' | 'es' | 'ar';

export type SmallTalkMatch = {
  intent: SmallTalkIntent;
  language: SmallTalkLanguage;
  answer: string;
  confidence: number;
  reason: string;
};

export type SmallTalkPattern = {
  phrase: string;
  lang: SmallTalkLanguage;
};

/**
 * Declarative intent definition — register new intents without changing the matcher core.
 */
export type SmallTalkIntentDefinition = {
  id: SmallTalkIntent;
  patterns: SmallTalkPattern[];
  /** Response pools keyed by reply language (missing langs fall back to en). */
  responses: Partial<Record<SmallTalkLanguage, string[]>>;
  reason?: string;
};

export type SmallTalkMatchOptions = {
  conversationId?: string;
  /** Conversation language sticky preference (en/fr/es/ar). */
  preferredLanguage?: SmallTalkLanguage;
};

export interface SmallTalkHandler {
  readonly id: SmallTalkIntent;
  match(
    normalized: string,
    original: string,
    options?: SmallTalkMatchOptions,
  ): SmallTalkMatch | null;
}
