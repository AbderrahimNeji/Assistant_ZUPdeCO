import { Injectable } from '@nestjs/common';

import { ReportApplicationService } from '../application/domain-application.services';
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
 * Session report actions with confirmation:
 * - create draft (to_complete) on focused session
 * - validate submitted report (PATCH …/validate)
 */
@Injectable()
export class ReportTool implements ApplicationTool {
  readonly id = 'report';
  readonly description =
    'Create a draft session report or validate a submitted report (with confirmation)';

  constructor(private readonly reports: ReportApplicationService) {}

  canHandle(question: string): boolean {
    // How-to / process questions belong to documentation RAG, not draft creation.
    if (
      matchesAny(question, [
        /\bcomment\b.+\b(cr[ée]er?|crée|cree|faire|g[ée]n[ée]rer|remplir|saisir)\b/i,
        /\bhow (do|does|can|to)\b.+\b(create|generate|make|fill)\b/i,
        /\b(qu['’]est[- ]ce|c['’]est quoi|explique|expliquer)\b/i,
      ])
    ) {
      return false;
    }
    return matchesAny(question, [
      /\b(générer|generer|generate|créer|cree|create|soumettre|submit)\b.{0,40}\b(compte.?rendu|report|cr)\b/i,
      /\b(compte.?rendu|report)\b.{0,20}\b(générer|generer|generate|créer|cree|create)\b/i,
      /\b(valid(?:er|e|ation)|validate)\b.{0,40}\b(compte.?rendu|report|cr)\b/i,
      /\b(compte.?rendu|report|cr)\b.{0,30}\b(valid(?:er|e|ation)|validate)\b/i,
    ]);
  }

  async validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    const message = asString(input.rawMessage);
    const wantsValidate =
      input.actionId === 'validate_report' ||
      asString(input.payload?.intent) === 'validate' ||
      matchesAny(message, [
        /\b(valid(?:er|e|ation)|validate)\b/i,
      ]);

    if (wantsValidate) {
      return this.validateValidateFlow(input);
    }

    return this.validateCreateDraftFlow(input, user);
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    const intent = asString(input.payload?.intent);
    const isValidate =
      intent === 'validate' ||
      input.actionId === 'validate_report';

    if (isValidate) {
      const sessionId = asString(input.payload?.sessionId);
      const reportId = asString(input.payload?.reportId);
      const result = await this.reports.validateReport(sessionId, reportId);
      return {
        validated: true,
        sessionLabel: asString(input.payload?.sessionLabel, 'Séance'),
        reportLabel: asString(input.payload?.reportLabel, 'Compte-rendu'),
        result,
      };
    }

    const sessionId = asString(input.payload?.sessionId);
    const authorId = user.userId;
    const created = await this.reports.createDraftReport(sessionId, authorId);
    return {
      created: true,
      sessionLabel: asString(input.payload?.sessionLabel, 'Séance'),
      result: created,
    };
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (status !== 'executed') return '';
    const row = data as {
      sessionLabel?: string;
      reportLabel?: string;
      validated?: boolean;
      created?: boolean;
    };
    if (row.validated) {
      return `Compte-rendu « ${row.reportLabel || 'CR'} » validé pour la séance « ${row.sessionLabel || 'séance'} ».`;
    }
    return `Brouillon de compte-rendu créé pour « ${row.sessionLabel || 'séance'} » (statut to_complete). Ouvrez la page Comptes-rendus pour le compléter.`;
  }

  private validateValidateFlow(
    input: ToolExecuteInput,
  ): ToolValidationResult {
    const sessionId =
      asString(input.payload?.sessionId) ||
      this.reports.resolveSessionId() ||
      '';
    const reportId =
      asString(input.payload?.reportId) ||
      this.reports.resolveReportId() ||
      '';
    const sessionLabel = asString(
      input.payload?.sessionLabel,
      'Séance sélectionnée',
    );
    const reportLabel = asString(
      input.payload?.reportLabel,
      'Compte-rendu sélectionné',
    );

    if (!sessionId || !reportId) {
      return {
        ok: false,
        error:
          'Ouvrez un compte-rendu soumis (session + rapport) dans Ednov avant de valider via le Copilot. La validation appelle PATCH /sessions/:id/reports/:reportId/validate (statut submitted requis).',
      };
    }

    if (
      (input.actionId === 'validate_report' ||
        asString(input.payload?.intent) === 'validate') &&
      (input.payload?.confirmed || input.payload?.alreadyConfirmed)
    ) {
      return {
        ok: true,
        payload: {
          intent: 'validate',
          sessionId,
          reportId,
          sessionLabel,
          reportLabel,
        },
      };
    }

    return {
      ok: true,
      confirmation: {
        summary: [
          'Je peux valider ce compte-rendu :',
          `• Séance : ${sessionLabel}`,
          `• Compte-rendu : ${reportLabel}`,
          `• Prérequis API : statut actuel doit être « submitted »`,
          `• Droits : action-validate-row (volunteer/coordinator scope)`,
          '',
          'Confirmez pour appeler PATCH /sessions/:id/reports/:reportId/validate.',
          'Il n’existe pas d’endpoint de refus (rejected) — utilisez Ednov pour demander une correction manuellement.',
        ].join('\n'),
        payload: {
          intent: 'validate',
          sessionId,
          reportId,
          sessionLabel,
          reportLabel,
        },
        preview: {
          title: 'Valider le compte-rendu',
          entities: [
            { type: 'session', label: sessionLabel },
            { type: 'report', label: reportLabel },
            { type: 'status', label: 'submitted → validated' },
          ],
        },
      },
    };
  }

  private validateCreateDraftFlow(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): ToolValidationResult {
    const sessionId =
      asString(input.payload?.sessionId) ||
      this.reports.resolveSessionId() ||
      '';
    const sessionLabel = asString(
      input.payload?.sessionLabel,
      'Séance sélectionnée',
    );

    if (!sessionId) {
      return {
        ok: false,
        error:
          'Sélectionnez une séance (ou un compte-rendu lié) dans Ednov avant de générer un brouillon via le Copilot.',
      };
    }

    if (
      (input.actionId === 'create_report_draft' ||
        asString(input.payload?.intent) === 'create_draft') &&
      (input.payload?.confirmed || input.payload?.alreadyConfirmed)
    ) {
      return {
        ok: true,
        payload: {
          intent: 'create_draft',
          sessionId,
          sessionLabel,
          authorId: user.userId,
        },
      };
    }

    return {
      ok: true,
      confirmation: {
        summary: [
          'Je peux créer un brouillon de compte-rendu :',
          `• Séance : ${sessionLabel}`,
          `• Statut initial : to_complete`,
          `• Auteur : ${`${user.firstName} ${user.lastName}`.trim()}`,
          '',
          'Confirmez pour appeler POST /sessions/:id/reports. Complétez ensuite le contenu dans Ednov.',
        ].join('\n'),
        payload: {
          intent: 'create_draft',
          sessionId,
          sessionLabel,
          authorId: user.userId,
        },
        preview: {
          title: 'Brouillon de compte-rendu',
          entities: [
            { type: 'session', label: sessionLabel },
            { type: 'status', label: 'to_complete' },
          ],
        },
      },
    };
  }
}
