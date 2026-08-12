import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroqService } from '../groq/groq.service';
import { HelpKnowledgeService } from './help-knowledge.service';
import type { HelpChatDto } from './dto/help-chat.dto';

const DEFAULT_HELP_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_HELP_MAX_TOKENS = 512;
const DEFAULT_HELP_TEMPERATURE = 0.3;

export interface HelpChatResponseDto {
  reply: string;
  /** Section titles from retrieved chunks for "Voir aussi" in the UI */
  relatedSections: string[];
}

@Injectable()
export class HelpAssistantService {
  constructor(
    private readonly groqService: GroqService,
    private readonly knowledgeService: HelpKnowledgeService,
    private readonly configService: ConfigService,
  ) {}

  async chat(dto: HelpChatDto): Promise<HelpChatResponseDto> {
    if (!this.groqService.isConfigured()) {
      throw new ServiceUnavailableException(
        "L'assistant d'aide n'est pas disponible (configuration IA manquante).",
      );
    }

    const outcome = this.knowledgeService.searchWithOutcome(dto.message, 5);
    const chunks = outcome.chunks;

    const relatedSections = [...new Set(chunks.map((c) => c.title))].slice(0, 8);

    const contextBlock =
      chunks.length > 0
        ? chunks
            .map((c) => `## ${c.title}\n${c.body}`)
            .join('\n\n')
        : '(Aucun extrait pertinent trouvé dans la base d’aide.)';

    const coverageNote = outcome.weakMatch
      ? '\n[Note interne : la pertinence des extraits est jugée faible — réponds avec prudence, propose de reformuler ou de contacter l’administrateur.]'
      : '';
    const emptyNote =
      chunks.length === 0
        ? '\n[Note interne : aucun extrait — indique clairement que ce point n’est pas documenté dans l’aide en ligne et oriente vers l’administrateur ou le support.]'
        : '';

    const systemPrompt = `Tu es l’assistant d’aide de la plateforme web ZupdeCo / Ednov (interface d’administration et de suivi pédagogique).

Règles :
- Réponds en français, de façon claire et concise, pour un utilisateur métier (pas développeur).
- Base-toi UNIQUEMENT sur les sections fournies ci-dessous. Si l’information n’y figure pas, dis-le honnêtement et propose de reformuler ou de consulter l’administrateur / le support.
- N’invente pas de boutons, menus ou règles métier absents des sections.
- Pour citer une source, utilise la forme : « Selon la section « … » » en reprenant le titre exact de la section (titre après ##). Ne dis jamais « Extrait 1 », « Extrait 2 » ni un numéro d’extrait.
- Ne décris pas de tables SQL, colonnes de base de données, clés ni schéma technique, sauf si une section le mentionne explicitement. Pour la structure BDD, renvoie vers la doc technique ou l’administrateur.
${coverageNote}${emptyNote}

Sections de la documentation produit :

${contextBlock}`;

    const prior = dto.messages ?? [];
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = prior.map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));
    history.push({ role: 'user', content: dto.message });

    const model =
      this.configService.get<string>('GROQ_HELP_MODEL')?.trim() || DEFAULT_HELP_MODEL;
    const maxTokensRaw = this.configService.get<string>('GROQ_HELP_MAX_TOKENS');
    const maxTokens = maxTokensRaw ? Number.parseInt(maxTokensRaw, 10) : DEFAULT_HELP_MAX_TOKENS;
    const tempRaw = this.configService.get<string>('GROQ_HELP_TEMPERATURE');
    const temperature = tempRaw ? Number.parseFloat(tempRaw) : DEFAULT_HELP_TEMPERATURE;

    const reply = await this.groqService.chat(systemPrompt, history, {
      model,
      maxTokens: Number.isFinite(maxTokens) ? maxTokens : DEFAULT_HELP_MAX_TOKENS,
      temperature: Number.isFinite(temperature) ? temperature : DEFAULT_HELP_TEMPERATURE,
    });

    return { reply, relatedSections };
  }
}
