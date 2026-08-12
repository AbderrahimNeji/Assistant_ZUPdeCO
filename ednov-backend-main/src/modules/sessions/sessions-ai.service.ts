import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroqService, type PedagogicalResourceItem } from '../groq/groq.service';
import { SessionsService } from './sessions.service';
import { Session } from './entities/session.entity';
import { SessionAiChatMessage } from './entities/session-ai-chat-message.entity';

export interface GenerateFromRecordingResponse {
  reportId: string;
  transcript: string;
  generatedScript: string;
  generatedComment: string;
  generatedResources: PedagogicalResourceItem[];
}

export interface SessionChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionChatRequest {
  messages: SessionChatMessage[];
}

export interface SessionChatResponse {
  content: string;
}

export interface SessionChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class SessionsAiService {
  constructor(
    private readonly groqService: GroqService,
    private readonly sessionsService: SessionsService,
    @InjectRepository(SessionAiChatMessage)
    private readonly chatMessageRepository: Repository<SessionAiChatMessage>,
  ) {}

  async generateFromRecording(
    sessionId: string,
    companyId: string,
    userId: string,
    roleCodes: string[],
    file: Express.Multer.File,
  ): Promise<GenerateFromRecordingResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No audio file provided');
    }
    if (!this.groqService.isConfigured()) {
      throw new ServiceUnavailableException(
        'AI generation is not configured (GROQ_API_KEY)',
      );
    }

    const session = await this.sessionsService.findOne(
      sessionId,
      companyId,
      userId,
      roleCodes,
    );
    const subjectName =
      session.subjectNames?.filter(Boolean).join(', ') || null;

    let transcript: string;
    try {
      transcript = await this.groqService.transcribe(
        file.buffer,
        file.mimetype || 'audio/mpeg',
      );
    } catch (err) {
      throw new ServiceUnavailableException(
        `Speech-to-text failed: ${(err as Error).message}`,
      );
    }

    let generatedScript: string;
    let generatedComment: string;
    let generatedResources: PedagogicalResourceItem[];
    try {
      const result = await this.groqService.generateCrAndResources(
        transcript,
        subjectName,
      );
      generatedScript = result.generatedScript;
      generatedComment = result.generatedComment;
      generatedResources = result.generatedResources;
    } catch (err) {
      throw new ServiceUnavailableException(
        `CR generation failed: ${(err as Error).message}`,
      );
    }

    const existingReport = await this.sessionsService.findSessionReportBySession(
      sessionId,
      companyId,
    );

    let reportId: string;
    try {
      if (existingReport) {
        await this.sessionsService.updateSessionReport(
          sessionId,
          existingReport.id,
          companyId,
          {
            authorFeedbacks: [{ idAuteur: userId, comment: generatedComment }],
            script: generatedScript,
            generatedResources,
            status: 'draft',
          },
          userId,
          userId,
          roleCodes,
        );
        reportId = existingReport.id;
      } else {
        const created = await this.sessionsService.createSessionReport(
          sessionId,
          companyId,
          {
            authorId: userId,
            authorFeedbacks: [{ idAuteur: userId, comment: generatedComment }],
            script: generatedScript,
            generatedResources,
            status: 'draft',
          },
          userId,
          userId,
          roleCodes,
        );
        reportId = created.id;
      }
    } catch (err) {
      const message = (err as Error)?.message ?? '';
      if (message.includes('script') || message.includes('column')) {
        throw new InternalServerErrorException(
          'Failed to save session report. The database may be missing the "script" column. Run migrations: npm run migration:run',
        );
      }
      throw new InternalServerErrorException(
        `Failed to save session report: ${message}`,
      );
    }

    return {
      reportId,
      transcript,
      generatedScript,
      generatedComment,
      generatedResources,
    };
  }

  async chat(
    sessionId: string,
    companyId: string,
    userId: string,
    roleCodes: string[],
    body: SessionChatRequest,
  ): Promise<SessionChatResponse> {
    if (!this.groqService.isConfigured()) {
      throw new ServiceUnavailableException(
        'AI generation is not configured (GROQ_API_KEY)',
      );
    }
    const messages = body?.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestException('At least one message is required');
    }
    const MAX_MESSAGES = 50;
    const trimmed = messages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content ?? '').slice(0, 4000),
    }));

    const session = await this.sessionsService.findOneForAiContext(
      sessionId,
      companyId,
      userId,
      roleCodes,
    );
    const sessionWithRelations = session as Session & {
      establishment?: { name?: string } | null;
      managedBy?: { firstName?: string | null; lastName?: string | null } | null;
    };
    const subjectLabel =
      session.subjectNames?.filter(Boolean).join(', ') || null;
    const levelLabel =
      session.levelNames?.filter(Boolean).join(', ') || null;
    const establishmentName =
      sessionWithRelations.establishment?.name ?? null;
    const managedBy = sessionWithRelations.managedBy;
    const tutorName =
      managedBy &&
      [managedBy.firstName, managedBy.lastName].filter(Boolean).length > 0
        ? [managedBy.firstName, managedBy.lastName].filter(Boolean).join(' ')
        : null;
    const topic = (sessionWithRelations as Session).topic ?? null;
    const sessionDate = (sessionWithRelations as Session).sessionDate;
    const startTime = (sessionWithRelations as Session).startTime ?? '';
    const endTime = (sessionWithRelations as Session).endTime ?? '';
    const dateStr =
      sessionDate instanceof Date
        ? sessionDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : String(sessionDate ?? '');
    const timeStr = [startTime, endTime].filter(Boolean).join(' – ') || '—';

    const contextParts: string[] = [];
    if (dateStr) contextParts.push(`Date : ${dateStr}`);
    if (timeStr && timeStr !== '—') contextParts.push(`Horaire : ${timeStr}`);
    if (subjectLabel) contextParts.push(`Matière : ${subjectLabel}`);
    if (levelLabel) contextParts.push(`Niveau : ${levelLabel}`);
    if (topic?.trim()) contextParts.push(`Thématique : ${topic.trim()}`);
    if (establishmentName) contextParts.push(`Établissement : ${establishmentName}`);
    if (tutorName) contextParts.push(`Tuteur : ${tutorName}`);
    const contextBlock =
      contextParts.length > 0
        ? `Contexte de la séance :\n${contextParts.join('\n')}`
        : 'Contexte de la séance : N/R.';

    const systemPrompt = `Tu es l'assistant pédagogique du tuteur pendant cette séance. Tu l'aides à préparer et animer la séance, à générer ou proposer des exercices, à expliquer des notions. Sois clair, objectif et pédagogique.

${contextBlock}

Réponds en français, de façon concise et adaptée au niveau et à la matière.`;

    let content: string;
    try {
      content = await this.groqService.chat(systemPrompt, trimmed);
    } catch (err) {
      throw new ServiceUnavailableException(
        `Chat failed: ${(err as Error).message}`,
      );
    }
    const reply = content ?? '';

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      try {
        await this.chatMessageRepository.save(
          this.chatMessageRepository.create({
            sessionId,
            companyId,
            role: 'user',
            content: String(lastUserMessage.content ?? '').slice(0, 4000),
          }),
        );
        await this.chatMessageRepository.save(
          this.chatMessageRepository.create({
            sessionId,
            companyId,
            role: 'assistant',
            content: reply.slice(0, 4000),
          }),
        );
      } catch {
        // non-fatal: do not fail the request if persistence fails
      }
    }

    return { content: reply };
  }

  async getChatHistory(
    sessionId: string,
    companyId: string,
    userId: string,
    roleCodes: string[],
  ): Promise<SessionChatHistoryItem[]> {
    await this.sessionsService.findOneForAiContext(
      sessionId,
      companyId,
      userId,
      roleCodes,
    );
    const rows = await this.chatMessageRepository.find({
      where: { sessionId, companyId },
      order: { createdAt: 'ASC' },
      select: ['role', 'content'],
    });
    return rows.map((r) => ({ role: r.role, content: r.content }));
  }
}
