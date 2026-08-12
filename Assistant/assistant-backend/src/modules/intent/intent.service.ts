import { Injectable } from '@nestjs/common';

export interface IntentResult {
  intent: string;
  category: string;
  confidence: number;
}

/**
 * Local intent classification — avoids an extra Gemini call per chat turn
 * (intent is metadata only and previously burned quota before answering).
 */
@Injectable()
export class IntentService {
  detectIntent(text: string): IntentResult {
    const normalized = text.trim().toLowerCase();

    if (!normalized) {
      return {
        intent: 'GeneralQuestion',
        category: 'Conversation',
        confidence: 0.5,
      };
    }

    if (
      /^(hi|hello|hey|bonjour|salut|good (morning|afternoon|evening))\b/i.test(
        normalized,
      )
    ) {
      return {
        intent: 'Greeting',
        category: 'Conversation',
        confidence: 0.9,
      };
    }

    if (/thank|thanks|merci/.test(normalized)) {
      return {
        intent: 'Thanks',
        category: 'Conversation',
        confidence: 0.9,
      };
    }

    if (
      /summar(?:y|ise|ize)|r[eé]sum[eé]|overview|explain|what is|what are|how (?:do|does|to)|pourquoi|\bwhy\b/.test(
        normalized,
      )
    ) {
      return {
        intent: 'DocumentQuestion',
        category: 'Knowledge',
        confidence: 0.8,
      };
    }

    return {
      intent: 'GeneralQuestion',
      category: 'Conversation',
      confidence: 0.6,
    };
  }
}
