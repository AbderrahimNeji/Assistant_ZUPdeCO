import {
  normalizeSmallTalkInput,
  pickRandomAvoiding,
} from './small-talk.normalize';
import { SMALL_TALK_INTENT_REGISTRY } from './small-talk.registry';
import type {
  SmallTalkHandler,
  SmallTalkIntentDefinition,
  SmallTalkLanguage,
  SmallTalkMatch,
} from './small-talk.types';

type ReplyMemory = {
  getPrevious: (intentId: string, lang: SmallTalkLanguage) => string | null;
  remember: (intentId: string, lang: SmallTalkLanguage, answer: string) => void;
};

export function createIntentHandler(
  definition: SmallTalkIntentDefinition,
  memory?: ReplyMemory,
): SmallTalkHandler {
  const phraseToLang = new Map<string, SmallTalkLanguage>();
  for (const pattern of definition.patterns) {
    const key = normalizeSmallTalkInput(pattern.phrase);
    if (key) phraseToLang.set(key, pattern.lang);
  }

  return {
    id: definition.id,
    match(normalized: string): SmallTalkMatch | null {
      const patternLang = phraseToLang.get(normalized);
      if (!patternLang) return null;

      const language = patternLang;
      const pool = resolveResponsePool(definition, language, normalized);
      const previous = memory?.getPrevious(definition.id, language) ?? null;
      const answer = pickRandomAvoiding(pool, previous);
      memory?.remember(definition.id, language, answer);

      return {
        intent: definition.id,
        language,
        answer,
        confidence: 0.99,
        reason: definition.reason ?? `Matched ${definition.id} small talk.`,
      };
    },
  };
}

function resolveResponsePool(
  definition: SmallTalkIntentDefinition,
  language: SmallTalkLanguage,
  normalized: string,
): string[] {
  // Prefer phrase-aligned French greetings (Bonjour vs Salut).
  if (definition.id === 'greeting' && language === 'fr') {
    if (normalized === 'salut') {
      return [
        'Salut ! Que puis-je faire pour vous ?',
        'Salut ! Comment puis-je vous aider ?',
        'Salut ! Je suis là si vous avez besoin d’aide.',
      ];
    }
    if (normalized === 'bonjour' || normalized === 'bonsoir') {
      return [
        "Bonjour ! 👋 Comment puis-je vous aider aujourd'hui ?",
        'Bonjour ! Je suis là pour vous aider.',
        "Bonjour ! Que puis-je faire pour vous aujourd'hui ?",
      ];
    }
  }

  if (definition.id === 'gratitude' && language === 'fr') {
    if (normalized === 'merci beaucoup' || normalized === 'merci bien') {
      return [
        "Je vous en prie ! Je suis là si vous avez besoin d'aide.",
        "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.",
        'Avec grand plaisir !',
      ];
    }
    if (normalized === 'merci') {
      return [
        "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.",
        'Avec plaisir !',
        "Ravi d'avoir pu vous aider !",
      ];
    }
  }

  if (definition.id === 'gratitude' && language === 'es') {
    if (normalized === 'muchas gracias' || normalized === 'mil gracias') {
      return [
        '¡De nada! Estoy aquí para ayudarte.',
        '¡Con mucho gusto!',
        '¡Para eso estoy!',
      ];
    }
    if (normalized === 'gracias') {
      return [
        '¡Con gusto! ¿En qué más puedo ayudarte?',
        '¡De nada!',
        'Encantado de ayudar.',
      ];
    }
  }

  return (
    definition.responses[language] ??
    definition.responses.en ??
    Object.values(definition.responses).flat()
  );
}

export function buildHandlersFromRegistry(
  definitions: SmallTalkIntentDefinition[] = SMALL_TALK_INTENT_REGISTRY,
  memory?: ReplyMemory,
): SmallTalkHandler[] {
  return definitions.map((definition) =>
    createIntentHandler(definition, memory),
  );
}

export const DEFAULT_SMALL_TALK_HANDLERS = buildHandlersFromRegistry();
