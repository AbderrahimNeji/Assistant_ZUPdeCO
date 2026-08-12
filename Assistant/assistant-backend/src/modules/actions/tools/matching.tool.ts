import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { MatchingApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  asString,
  matchesAny,
} from '../tool.types';

/**
 * Assign student↔tutor on a focused session via PUT /sessions/:id/assignments.
 * Always requires confirmation preview.
 */
@Injectable()
export class MatchingTool implements ApplicationTool {
  readonly id = 'matching';
  readonly description =
    'Assign a tutor to a student on the focused Ednov session (with confirmation)';

  constructor(private readonly matching: MatchingApplicationService) {}

  canHandle(question: string, user: ToolUserContext): boolean {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
      return false;
    }
    return matchesAny(question, [
      /\b(assign|attribuer|apparier|matcher|matching)\b.{0,40}\b(tutor|tuteur|élève|eleve|student)\b/i,
      /\b(tutor|tuteur)\b.{0,30}\b(assign|attribuer|apparier)\b/i,
      /\b(créer|cree|create)\b.{0,20}\b(binôme|binome|appariement|matching)\b/i,
    ]);
  }

  async validate(
    input: ToolExecuteInput,
    _user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    const sessionId =
      asString(input.payload?.sessionId) || this.matching.resolveSessionId() || '';
    const studentUserId =
      asString(input.payload?.studentUserId) ||
      this.matching.resolveStudentId() ||
      '';
    const tutorUserId =
      asString(input.payload?.tutorUserId) ||
      this.matching.resolveTutorId() ||
      '';
    const studentLabel = asString(input.payload?.studentLabel, 'Élève sélectionné');
    const tutorLabel = asString(input.payload?.tutorLabel, 'Tuteur sélectionné');
    const sessionLabel = asString(input.payload?.sessionLabel, 'Séance sélectionnée');

    if (!sessionId || !studentUserId || !tutorUserId) {
      return {
        ok: false,
        error:
          'Pour assigner un tuteur, ouvrez une séance et sélectionnez un élève + un tuteur dans Ednov (ApplicationContext), puis redemandez.',
      };
    }

    if (
      input.actionId === 'assign_pair' &&
      (input.payload?.confirmed || input.payload?.alreadyConfirmed)
    ) {
      return {
        ok: true,
        payload: {
          sessionId,
          studentUserId,
          tutorUserId,
          studentLabel,
          tutorLabel,
          sessionLabel,
        },
      };
    }

    return {
      ok: true,
      confirmation: {
        summary: [
          'Je peux enregistrer cet appariement sur la séance :',
          `• Séance : ${sessionLabel}`,
          `• Élève : ${studentLabel}`,
          `• Tuteur : ${tutorLabel}`,
          '',
          'Confirmez pour appeler PUT /sessions/:id/assignments (remplace les paires de la séance).',
        ].join('\n'),
        payload: {
          sessionId,
          studentUserId,
          tutorUserId,
          studentLabel,
          tutorLabel,
          sessionLabel,
        },
        preview: {
          title: 'Appariement élève ↔ tuteur',
          entities: [
            { type: 'session', label: sessionLabel },
            { type: 'student', label: studentLabel },
            { type: 'tutor', label: tutorLabel },
          ],
          warnings: [
            'Cette action remplace les appariements manuels existants de la séance.',
          ],
        },
      },
    };
  }

  async execute(
    input: ToolExecuteInput,
    _user: ToolUserContext,
  ): Promise<unknown> {
    const sessionId = asString(input.payload?.sessionId);
    const studentUserId = asString(input.payload?.studentUserId);
    const tutorUserId = asString(input.payload?.tutorUserId);
    const result = await this.matching.setAssignments(sessionId, [
      { studentUserId, tutorUserId },
    ]);
    return {
      assigned: true,
      studentLabel: asString(input.payload?.studentLabel, 'Élève'),
      tutorLabel: asString(input.payload?.tutorLabel, 'Tuteur'),
      sessionLabel: asString(input.payload?.sessionLabel, 'Séance'),
      result,
    };
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (status !== 'executed') return '';
    const row = data as {
      studentLabel?: string;
      tutorLabel?: string;
      sessionLabel?: string;
    };
    return `Appariement enregistré sur « ${row.sessionLabel || 'séance'} » : ${row.studentLabel || 'élève'} ↔ ${row.tutorLabel || 'tuteur'}.`;
  }
}
