import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GROQ_TRANSCRIPTIONS_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';
const CHAT_MODEL = 'llama-3.3-70b-versatile';

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') return v;
  }
  return '';
}

export interface TranscribeResult {
  text: string;
}

export interface PedagogicalResourceItem {
  title: string;
  problem: string;
  solution: string;
}

export interface GenerateFromRecordingResult {
  generatedScript: string;
  generatedComment: string;
  generatedResources: PedagogicalResourceItem[];
}

/** Optional overrides for Groq chat completions (e.g. help assistant vs session tutor). */
export interface GroqChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

@Injectable()
export class GroqService {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('GROQ_API_KEY');
    this.apiKey = key?.trim() ?? '';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Transcribe audio to text (French) using Groq Whisper.
   */
  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GROQ_API_KEY is not configured');
    }
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || 'audio/mpeg' });
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', WHISPER_MODEL);
    formData.append('language', 'fr');
    formData.append('response_format', 'json');

    const response = await fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ServiceUnavailableException(
        `Groq Whisper failed: ${response.status} ${errText}`,
      );
    }
    const data = (await response.json()) as { text?: string };
    return (data.text ?? '').trim();
  }

  /**
   * Generate session script (Tuteur/Élève), CR draft and pedagogical resources from transcript using Groq LLM.
   */
  async generateCrAndResources(
    transcript: string,
    subjectName: string | null,
  ): Promise<GenerateFromRecordingResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GROQ_API_KEY is not configured');
    }
    const subjectContext = subjectName
      ? `Matière/thématique de la séance : ${subjectName}.`
      : '';

    const systemPrompt = `Tu es un assistant pédagogique. À partir de la transcription d'une séance de tutorat (échanges entre tuteur et élève), tu dois produire trois sorties en français.

1) Un script de la séance : la transcription est un bloc de texte sans indication de locuteur. Tu dois inférer pour chaque tour de parole qui est le tuteur (questions, consignes, explications) et qui est l'élève (réponses, demandes d'aide). Produis un dialogue où chaque ligne commence par [Tuteur] ou [Élève] suivi du texte correspondant. Une ligne par réplique, séparées par des retours à la ligne. Exemple :
[Tuteur] Bonjour, on va revoir les équations.
[Élève] D'accord, j'ai pas compris la partie 2.

2) Un brouillon de compte rendu (CR) en un seul bloc de texte, structuré avec des titres ou paragraphes clairs pour : résumé de la séance, thèmes abordés, difficultés identifiées, progrès observés, recommandations pédagogiques. Ce texte sera stocké tel quel dans le champ "commentaire" du CR.

3) Une à trois ressources pédagogiques (exercices, fiches) adaptées au contenu de la séance. Chaque ressource doit avoir un titre court, un énoncé ou problème (instructions de l'exercice), et une solution ou corrigé (réponse attendue ou démarche).

Réponds UNIQUEMENT avec un JSON valide, sans markdown ni préambule, de la forme :
{"script": "[Tuteur] ...\\n[Élève] ...", "cr": "texte du compte rendu...", "ressources": [{"titre": "Titre court", "probleme": "Énoncé ou consigne de l'exercice...", "solution": "Solution ou corrigé..."}]}
${subjectContext}`;

    const userContent =
      transcript.length > 0
        ? `Transcription de la séance :\n\n${transcript}`
        : 'Aucune transcription fournie (enregistrement vide ou illisible). Génère malgré tout un squelette de CR avec des sections vides ou "À compléter" et une ressource générique.';

    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ServiceUnavailableException(
        `Groq Chat failed: ${response.status} ${errText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content =
      data.choices?.[0]?.message?.content?.trim() ??
      '{"script":"","cr":"","ressources":[]}';

    type RawRessource = string | { titre?: string; title?: string; probleme?: string; problem?: string; solution?: string; corrige?: string };
    let parsed: { script?: string; cr?: string; ressources?: RawRessource[] };
    try {
      parsed = JSON.parse(content) as { script?: string; cr?: string; ressources?: RawRessource[] };
    } catch {
      parsed = { script: '', cr: content, ressources: [] };
    }
    const generatedScript =
      typeof parsed.script === 'string' ? parsed.script : String(parsed.script ?? '');
    const generatedComment =
      typeof parsed.cr === 'string' ? parsed.cr : String(parsed.cr ?? '');
    const rawRessources = Array.isArray(parsed.ressources) ? parsed.ressources : [];
    const generatedResources: PedagogicalResourceItem[] = rawRessources.map((r) => {
      if (typeof r === 'string') {
        return { title: r.trim(), problem: '', solution: '' };
      }
      const obj = r as Record<string, unknown>;
      const title = pickString(obj, 'titre', 'title');
      const problem = pickString(obj, 'probleme', 'problem');
      const solution = pickString(obj, 'solution', 'corrige');
      return {
        title: String(title ?? '').trim(),
        problem: String(problem ?? '').trim(),
        solution: String(solution ?? '').trim(),
      };
    });

    return { generatedScript, generatedComment, generatedResources };
  }

  /**
   * Chat completion with a system prompt and conversation history.
   * Used by the tutor session assistant and the platform help assistant.
   */
  async chat(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: GroqChatOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GROQ_API_KEY is not configured');
    }
    const model = options?.model ?? CHAT_MODEL;
    const max_tokens = options?.maxTokens ?? 2048;
    const temperature = options?.temperature ?? 0.5;

    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature,
        max_tokens,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new ServiceUnavailableException(
        `Groq Chat failed: ${response.status} ${errText}`,
      );
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
}
