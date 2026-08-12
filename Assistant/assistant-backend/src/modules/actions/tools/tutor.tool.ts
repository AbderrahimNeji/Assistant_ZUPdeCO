import { Injectable, Logger } from '@nestjs/common';

import { TutorApplicationService } from '../application/domain-application.services';
import { RequestContextStore } from '../../integration/request-context';
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
export class TutorTool implements ApplicationTool {
  readonly id = 'tutor';
  readonly description =
    'List tutors and propose booking a tutoring session (not live BI)';

  private readonly logger = new Logger(TutorTool.name);

  constructor(private readonly tutors: TutorApplicationService) {}

  canHandle(question: string): boolean {
    if (
      /\b(cr[ée]er?|crée|cree|create|planifi(?:er|e)|ajouter|nouvelle?)\b.{0,40}\b(s[ée]ance|seance|session)s?\b/i.test(
        question,
      )
    ) {
      return false;
    }
    if (isTutorLiveLookup(question)) {
      return false;
    }
    return matchesAny(question, [
      /\b(book|schedule|reserve)\b.*\b(tutor|tutoring|session)\b/i,
      /\b(find|list|who is|my tutor)\b.*\b(tutor|tutors|tuteur)\b/i,
    ]);
  }

  async validate(input: ToolExecuteInput): Promise<ToolValidationResult> {
    if (input.actionId === 'book_session') {
      const tutorId = asString(input.payload?.tutorId);
      const tutorName = asString(input.payload?.tutorName, 'your tutor');
      if (!tutorId) {
        return { ok: false, error: 'Select a tutor to book a session.' };
      }
      return {
        ok: true,
        confirmation: {
          summary: [
            'Je peux enregistrer une demande de séance de tutorat :',
            `• Tuteur : ${tutorName}`,
            '',
            'Confirmez pour enregistrer la demande (le tuteur devra confirmer le créneau).',
          ].join('\n'),
          payload: { tutorId, tutorName, booked: true },
          preview: {
            title: 'Demande de séance',
            entities: [
              { type: 'tutor', label: tutorName },
            ],
          },
        },
        payload: { tutorId, tutorName, booked: true },
      };
    }

    const ctx = RequestContextStore.getApplicationContext();
    const focused = ctx?.tutor ??
      (isTutorType(ctx?.selection?.primary?.type)
        ? ctx?.selection?.primary
        : undefined);

    this.logger.debug(
      `tutor-tool focus type=${focused?.type ?? 'none'} id=${focused?.id ?? 'none'} label=${focused?.label ?? 'none'} role=${focused?.role ?? 'none'} page=${focused?.page ?? ctx?.page?.title ?? 'none'}`,
    );

    if (isTutorLiveLookup(input.rawMessage) || (focused?.id && !isBookingIntent(input.rawMessage))) {
      this.logger.debug(
        `tutor-tool deferring to TutorSkill focusedId=${focused?.id ?? 'none'}`,
      );
      return { ok: false, defer: true };
    }

    const keyword = extractTutorKeyword(input.rawMessage);
    const rows = keyword
      ? await this.tutors.findByName(keyword)
      : await this.tutors.listTutors(8);

    if (!rows.length) {
      const listed = await this.tutors.listTutors(8);
      if (listed.length) {
        return {
          ok: true,
          proposal: {
            message: `I found ${listed.length} tutor${listed.length > 1 ? 's' : ''}.`,
            actions: listed.slice(0, 5).map((tutor) => ({
              id: 'book_session',
              label: `Book · ${tutor.firstName} ${tutor.lastName}`,
              toolId: this.id,
              style: 'primary' as const,
              payload: {
                tutorId: tutor.id,
                tutorName: `${tutor.firstName} ${tutor.lastName}`,
              },
            })),
          },
          payload: { tutors: listed },
        };
      }
      return {
        ok: false,
        error: 'No tutors are available right now.',
      };
    }

    const wantsBook = isBookingIntent(input.rawMessage);

    return {
      ok: true,
      proposal: {
        message: wantsBook
          ? 'Tutoring session available. Choose a tutor to book:'
          : `I found ${rows.length} tutor${rows.length > 1 ? 's' : ''}.`,
        actions: rows.slice(0, 5).map((tutor) => ({
          id: 'book_session',
          label: `Book · ${tutor.firstName} ${tutor.lastName}`,
          toolId: this.id,
          style: 'primary' as const,
          payload: {
            tutorId: tutor.id,
            tutorName: `${tutor.firstName} ${tutor.lastName}`,
          },
        })),
      },
      payload: { tutors: rows },
    };
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    if (input.actionId === 'book_session') {
      return {
        tutorId: asString(input.payload?.tutorId),
        tutorName: asString(input.payload?.tutorName),
        studentId: user.userId,
        status: 'REQUESTED',
        note: 'Session request recorded. Your tutor will confirm the slot.',
      };
    }

    return this.tutors.listTutors(8);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (
      status === 'executed' &&
      data &&
      typeof data === 'object' &&
      'tutorName' in data
    ) {
      const row = data as { tutorName: string };
      return `Tutoring session requested with ${row.tutorName}. They will confirm the time shortly.`;
    }

    const rows = data as Array<{
      firstName: string;
      lastName: string;
      coursesTaught: Array<{ title: string }>;
    }>;

    if (!rows?.length) return 'No tutors found.';

    return [
      'Tutors:',
      ...rows.map(
        (tutor, index) =>
          `${index + 1}. ${tutor.firstName} ${tutor.lastName}` +
          (tutor.coursesTaught.length
            ? ` — ${tutor.coursesTaught.map((c) => c.title).join(', ')}`
            : ''),
      ),
    ].join('\n');
  }
}

function isBookingIntent(message: string): boolean {
  return /\b(book|schedule|reserve)\b/i.test(message);
}

function isTutorType(type?: string): boolean {
  return /^(tutor|tuteur|tuteure|teacher)$/i.test((type ?? '').trim());
}

/** Live BI about a focused / named tutor — owned by TutorSkill, not this booking tool. */
export function isTutorLiveLookup(question: string): boolean {
  if (isBookingIntent(question)) return false;
  if (
    /\b(this tutor|ce tuteur|cette tutrice|cette tuteure|focused tutor|selected tutor)\b/i.test(
      question,
    )
  ) {
    return true;
  }
  return (
    /\b(tutor|tuteurs?|tuteur|tuteure)\b/i.test(question) &&
    /\b(workload|charge|assigned students|élèves assignés|eleves assignes|availability|disponibilité|disponibilite|timetable|emploi du temps)\b/i.test(
      question,
    )
  );
}

function extractTutorKeyword(message: string): string | null {
  const cleaned = message
    .replace(
      /\b(book|schedule|reserve|tutor|tutors|teacher|tuteur|tuteure|session|with|a|the|my|me|show|list|find|this|that|workload|assigned|students|availability|and)\b/gi,
      ' ',
    )
    .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  if (/^(s|this|that|the)$/i.test(cleaned)) return null;
  return cleaned.split(/\s+/).slice(0, 3).join(' ');
}
