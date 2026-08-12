import { Injectable } from '@nestjs/common';
import { franc } from 'franc';

export type DetectedLanguage =
  | 'French'
  | 'English'
  | 'Arabic'
  | 'Spanish'
  | 'German'
  | 'Italian'
  | 'Unknown';

const LOCALE_TO_LANGUAGE: Record<string, DetectedLanguage> = {
  fr: 'French',
  en: 'English',
  ar: 'Arabic',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
};

@Injectable()
export class LanguageService {
  /**
   * Detect the language of the user message.
   * Short texts are unreliable for franc — heuristics + optional UI locale fill gaps.
   */
  async detectLanguage(
    text: string,
    preferredLocale?: string | null,
  ): Promise<DetectedLanguage> {
    const trimmed = text?.trim() || '';
    if (!trimmed) {
      return this.fromLocale(preferredLocale) ?? 'Unknown';
    }

    const heuristic = this.heuristicLanguage(trimmed);
    if (heuristic) return heuristic;

    const lang = franc(trimmed, { minLength: 3 });
    const mapped = this.fromFranc(lang);
    if (mapped !== 'Unknown') return mapped;

    return this.fromLocale(preferredLocale) ?? 'Unknown';
  }

  /** Exact refusal line the model must use when context is insufficient. */
  insufficientContextMessage(language: string): string {
    switch (language) {
      case 'French':
        return "Je n'ai pas trouvé cette information dans les documents ou la base de données de l'application.";
      case 'Arabic':
        return 'لم أجد هذه المعلومة في المستندات المرفوعة أو قاعدة بيانات التطبيق.';
      case 'Spanish':
        return 'No encontré esta información en los documentos cargados ni en la base de datos de la aplicación.';
      case 'German':
        return 'Diese Information konnte ich in den hochgeladenen Dokumenten oder der Anwendungsdatenbank nicht finden.';
      case 'Italian':
        return 'Non ho trovato queste informazioni nei documenti caricati o nel database dell’applicazione.';
      case 'English':
      default:
        return "I couldn't find this information in the uploaded documents or company database.";
    }
  }

  private fromFranc(code: string): DetectedLanguage {
    switch (code) {
      case 'fra':
        return 'French';
      case 'eng':
        return 'English';
      case 'arb':
      case 'ara':
        return 'Arabic';
      case 'spa':
        return 'Spanish';
      case 'deu':
        return 'German';
      case 'ita':
        return 'Italian';
      default:
        return 'Unknown';
    }
  }

  private fromLocale(locale?: string | null): DetectedLanguage | null {
    if (!locale?.trim()) return null;
    const primary = locale.trim().toLowerCase().split(/[-_]/)[0];
    return LOCALE_TO_LANGUAGE[primary] ?? null;
  }

  private heuristicLanguage(text: string): DetectedLanguage | null {
    const lower = text.toLowerCase();

    // Arabic script — highest priority
    if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';

    // Romanized Arabic / Maghrebi Darija cues (no Arabic script)
    if (this.hasRomanizedArabic(lower)) return 'Arabic';

    const frenchHits = (
      lower.match(
        /\b(bonjour|salut|merci|combien|comment|pourquoi|qu['’]est|est-ce|élève|eleve|séance|seance|tuteur|oui|non|avec|pour|dans|sur|les|des|une|je|tu|nous|vous|mon|ma|mes|cette|cet|quoi|peux|pouvez|donne|montre|résume|resume|aujourd['’]hui)\b/g,
      ) ?? []
    ).length;
    const hasFrenchAccents = /[àâäéèêëïîôùûüçœæ]/i.test(text);

    const englishHits = (
      lower.match(
        /\b(hello|hi|thanks|please|how many|what|why|when|where|which|student|tutor|session|show|find|summarize|the|and|with|for|this|that|can you)\b/g,
      ) ?? []
    ).length;

    const spanishHits = (
      lower.match(
        /\b(hola|gracias|cuántos|cuantos|cómo|como|por qué|porque|estudiante|sesión|sesion|mostrar|resumir)\b/g,
      ) ?? []
    ).length;

    if (hasFrenchAccents || frenchHits >= 1) {
      if (englishHits > frenchHits + 1) return 'English';
      return 'French';
    }
    if (spanishHits >= 1 && spanishHits >= englishHits) return 'Spanish';
    if (englishHits >= 1) return 'English';

    return null;
  }

  /** Tunisian / Maghrebi Darija written in Latin letters (e.g. "tahki arabi"). */
  private hasRomanizedArabic(lower: string): boolean {
    if (
      /\b(tahki|tehki|te7ki|arabi|3arbi|labes|chnoua|chnouwa|chnowa|bara|yezzi|sa7a|saha|aaslema|ahla|marhba|chokran|shukran|wallah|inchallah|inshallah|7aja|kiifik|kifek)\b/.test(
        lower,
      )
    ) {
      return true;
    }
    // Short chat cues that are ambiguous alone ("cv", "win") — only with other Maghrebi context
    if (/\b(cv|win)\b/.test(lower) && /\b(labes|chnoua|chnouwa|chnowa|arabi|3arbi|tahki|tehki)\b/.test(lower)) {
      return true;
    }
    // Standalone common Maghrebi greetings / chat openers
    if (/^(labes|aaslema|ahla|marhba|cv\s*\??|win\s+enti?|chnoua|chnouwa|chnowa)(\s|$)/.test(lower)) {
      return true;
    }
    return false;
  }
}
