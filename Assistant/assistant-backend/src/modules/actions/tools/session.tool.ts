import { Injectable } from '@nestjs/common';

import { SessionApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolActionButton,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  asString,
  matchesAny,
} from '../tool.types';

const SESSION_TYPES = [
  {
    id: 'individual_tutoring',
    label: 'Tutorat individuel',
  },
  {
    id: 'homework_help',
    label: 'Aide aux devoirs',
  },
  {
    id: 'workshop',
    label: 'Atelier',
  },
  {
    id: 'group_tutoring',
    label: 'Tutorat de groupe',
  },
  {
    id: 'whole_class',
    label: 'Classe entière',
  },
] as const;

type SessionDraft = {
  type?: string;
  typeLabel?: string;
  establishmentId?: string;
  establishmentLabel?: string;
  subjectId?: string;
  subjectLabel?: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  programId?: string;
  tutorIds?: string[];
  studentIds?: string[];
  volunteerIds?: string[];
  topic?: string;
};

@Injectable()
export class SessionTool implements ApplicationTool {
  readonly id = 'session';
  readonly description =
    'Guide, create, or cancel an Ednov tutoring session (séance) with confirmation';

  constructor(private readonly sessions: SessionApplicationService) {}

  canHandle(question: string): boolean {
    return isCreateSessionIntent(question) || isCancelSessionIntent(question);
  }

  async validate(
    input: ToolExecuteInput,
    _user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    if (
      input.actionId === 'cancel_session' ||
      isCancelSessionIntent(input.rawMessage)
    ) {
      return this.validateCancel(input);
    }

    const draft = mergeDraft(
      (input.payload ?? {}) as SessionDraft,
      parseDraftFromMessage(input.rawMessage),
      this.sessions.resolveDefaults(),
    );

    if (input.actionId === 'open_create_form') {
      return {
        ok: true,
        payload: {
          ...draft,
          openCreateForm: true,
          guideOnly: true,
        },
      };
    }

    if (input.actionId === 'pick_type') {
      const type = asString(input.payload?.type);
      const typeLabel =
        SESSION_TYPES.find((row) => row.id === type)?.label ?? type;
      return this.nextStepAfterType({ ...draft, type, typeLabel });
    }

    if (input.actionId === 'pick_establishment') {
      const establishmentId = asString(input.payload?.establishmentId);
      const establishmentLabel = asString(
        input.payload?.establishmentLabel,
        establishmentId,
      );
      return this.nextStepAfterEstablishment({
        ...draft,
        establishmentId,
        establishmentLabel,
      });
    }

    if (input.actionId === 'pick_subject') {
      const subjectId = asString(input.payload?.subjectId);
      const subjectLabel = asString(input.payload?.subjectLabel, subjectId);
      const next = {
        ...draft,
        subjectId,
        subjectLabel,
      };
      return this.finalizeOrConfirm(next, input);
    }

    if (input.actionId === 'create_session') {
      return this.finalizeOrConfirm(draft, input);
    }

    // Fresh create intent — guide to Ednov form (no RAG refusal).
    if (!draft.type) {
      return {
        ok: true,
        proposal: {
          message: [
            'Pour créer une séance dans Ednov :',
            '',
            '1. Ouvrez la page **Gestion des Séances**.',
            '2. Cliquez sur **« Créer une séance »** ou **« Planification des séances »**.',
            '3. Choisissez **Individuel** ou **Collectif**.',
            '4. Renseignez : établissement, date, horaires, type, matière(s), puis au moins un tuteur/VSC et un élève.',
            '5. Validez le formulaire.',
            '',
            'Le formulaire Ednov est le chemin recommandé (participants, salle, récurrence).',
          ].join('\n'),
          actions: [
            openFormAction(draft),
            ...SESSION_TYPES.slice(0, 3).map(
              (row): ToolActionButton => ({
                id: 'pick_type',
                label: row.label,
                toolId: this.id,
                style: 'secondary',
                payload: { type: row.id, typeLabel: row.label },
              }),
            ),
          ],
        },
        payload: { ...draft, guideOnly: true } as Record<string, unknown>,
      };
    }

    return this.finalizeOrConfirm(draft, input);
  }

  async execute(
    input: ToolExecuteInput,
    _user: ToolUserContext,
  ): Promise<unknown> {
    if (input.payload?.cancelSession) {
      const sessionId = asString(input.payload.sessionId);
      const reasonCode = asString(input.payload.reasonCode, 'OTHER');
      const reasonDetail = asString(
        input.payload.reasonDetail,
        'Cancelled via Copilot',
      );
      const cancelled = await this.sessions.cancelSession(sessionId, {
        reasonCode,
        reasonDetail:
          reasonCode === 'OTHER'
            ? reasonDetail || 'Cancelled via Copilot'
            : undefined,
      });
      return {
        cancelled: true,
        sessionLabel: asString(input.payload.sessionLabel, 'Séance'),
        result: cancelled,
      };
    }

    if (input.payload?.openCreateForm || input.payload?.guideOnly) {
      return {
        openCreateForm: true,
        draft: input.payload,
      };
    }

    const type = asString(input.payload?.type);
    const establishmentId = asString(input.payload?.establishmentId);
    const subjectId = asString(input.payload?.subjectId);
    const sessionDate = asString(input.payload?.sessionDate);
    const startTime = asString(input.payload?.startTime, '09:00');
    const endTime = asString(input.payload?.endTime, '10:00');
    const tutorIds = asStringArray(input.payload?.tutorIds);
    const studentIds = asStringArray(input.payload?.studentIds);
    const volunteerIds = asStringArray(input.payload?.volunteerIds);

    const created = await this.sessions.createSession({
      type,
      establishmentId,
      subjectIds: [subjectId],
      sessionDate,
      startTime,
      endTime,
      programId: asString(input.payload?.programId) || undefined,
      sessionFormat: 'in_person',
      mode: 'single',
      tutorIds,
      studentIds,
      volunteerIds,
      topic: asString(input.payload?.topic) || undefined,
    });

    return { created, draft: input.payload };
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (status !== 'executed') return '';

    const row = data as {
      openCreateForm?: boolean;
      cancelled?: boolean;
      sessionLabel?: string;
      created?: { id?: string; type?: string; sessionDate?: string };
      draft?: SessionDraft;
    };

    if (row.cancelled) {
      return `Séance annulée : ${row.sessionLabel || 'sélectionnée'}. Les appariements associés sont démêlés (GLOBAL).`;
    }

    if (row.openCreateForm) {
      return [
        'Ouvrez le formulaire « Planification des séances » sur la page Gestion des Séances pour finaliser (participants, salle, récurrence…).',
        'Sur cette page, utilisez aussi le bouton « Créer avec l’assistant » pour démarrer le formulaire.',
        formatDraftSummary(row.draft),
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    const id = row.created?.id;
    return [
      'Séance créée avec succès.',
      id ? `Identifiant : ${id}` : null,
      row.created?.sessionDate
        ? `Date : ${row.created.sessionDate}`
        : null,
      row.created?.type ? `Type : ${labelForType(row.created.type)}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async validateCancel(
    input: ToolExecuteInput,
  ): Promise<ToolValidationResult> {
    const focused = await this.sessions.getFocusedSession();
    const sessionId =
      asString(input.payload?.sessionId) || focused?.id || '';
    if (!sessionId) {
      return {
        ok: false,
        error:
          'Sélectionnez une séance dans Ednov (page Gestion des Séances) avant d’annuler via le Copilot.',
      };
    }

    const sessionLabel =
      asString(input.payload?.sessionLabel) ||
      focused?.session?.title ||
      focused?.session?.name ||
      'Séance sélectionnée';
    const reasonCode = asString(input.payload?.reasonCode, 'OTHER');
    const reasonDetail = asString(
      input.payload?.reasonDetail,
      'Annulation demandée via Copilot',
    );

    if (
      input.actionId === 'cancel_session' &&
      (input.payload?.confirmed || input.payload?.alreadyConfirmed)
    ) {
      return {
        ok: true,
        payload: {
          cancelSession: true,
          sessionId,
          sessionLabel,
          reasonCode,
          reasonDetail,
        },
      };
    }

    return {
      ok: true,
      confirmation: {
        summary: [
          'Je peux annuler cette séance :',
          `• Séance : ${sessionLabel}`,
          `• Motif : ${reasonCode}`,
          '',
          'Confirmez pour appeler l’API Ednov (dématch GLOBAL). Cette action est sensible.',
        ].join('\n'),
        payload: {
          cancelSession: true,
          sessionId,
          sessionLabel,
          reasonCode,
          reasonDetail,
        },
        preview: {
          title: 'Annulation de séance',
          entities: [
            { type: 'session', label: sessionLabel },
            { type: 'reason', label: reasonCode },
          ],
          warnings: ['Les appariements liés seront démêlés (GLOBAL).'],
        },
      },
    };
  }

  private async nextStepAfterType(
    draft: SessionDraft,
  ): Promise<ToolValidationResult> {
    if (draft.establishmentId) {
      return this.nextStepAfterEstablishment(draft);
    }

    const establishments = await this.sessions.listEstablishments(6);
    if (!establishments.length) {
      return {
        ok: true,
        proposal: {
          message: [
            `Type choisi : ${draft.typeLabel ?? draft.type}.`,
            'Aucun établissement n’est accessible via l’API. Ouvrez le formulaire Ednov pour continuer.',
          ].join('\n'),
          actions: [openFormAction(draft)],
        },
        payload: draft as Record<string, unknown>,
      };
    }

    return {
      ok: true,
      proposal: {
        message: [
          `Type choisi : ${draft.typeLabel ?? draft.type}.`,
          'Choisissez un établissement :',
        ].join('\n'),
        actions: [
          ...establishments.map((row): ToolActionButton => {
            const label = row.name || row.label || row.id;
            return {
              id: 'pick_establishment',
              label: row.city ? `${label} (${row.city})` : label,
              toolId: this.id,
              style: 'primary',
              payload: {
                ...draft,
                establishmentId: row.id,
                establishmentLabel: label,
              },
            };
          }),
          openFormAction(draft),
        ],
      },
      payload: draft as Record<string, unknown>,
    };
  }

  private async nextStepAfterEstablishment(
    draft: SessionDraft,
  ): Promise<ToolValidationResult> {
    if (draft.subjectId) {
      return this.finalizeOrConfirm(draft, {
        rawMessage: '',
        conversationId: '',
      });
    }

    const subjects = await this.sessions.listSubjects(6);
    if (!subjects.length) {
      return {
        ok: true,
        proposal: {
          message: [
            `Établissement : ${draft.establishmentLabel ?? draft.establishmentId}.`,
            'Aucune matière accessible. Ouvrez le formulaire Ednov pour continuer.',
          ].join('\n'),
          actions: [openFormAction(draft)],
        },
        payload: draft as Record<string, unknown>,
      };
    }

    return {
      ok: true,
      proposal: {
        message: [
          `Établissement : ${draft.establishmentLabel ?? draft.establishmentId}.`,
          'Choisissez une matière :',
        ].join('\n'),
        actions: [
          ...subjects.map((row): ToolActionButton => {
            const label = row.label || row.name || row.code || row.id;
            return {
              id: 'pick_subject',
              label,
              toolId: this.id,
              style: 'primary',
              payload: {
                ...draft,
                subjectId: row.id,
                subjectLabel: label,
              },
            };
          }),
          openFormAction(draft),
        ],
      },
      payload: draft as Record<string, unknown>,
    };
  }

  private finalizeOrConfirm(
    draft: SessionDraft,
    input: ToolExecuteInput,
  ): ToolValidationResult {
    const missing = missingRequiredFields(draft);

    if (missing.length) {
      return {
        ok: true,
        proposal: {
          message: [
            'Pour créer la séance via l’API, il manque encore :',
            ...missing.map((item) => `• ${item}`),
            '',
            'Indiquez-les dans le chat (ex. « le 2026-08-15 de 09:00 à 10:00 ») ou ouvrez le formulaire Ednov — surtout pour ajouter tuteur(s) et élève(s).',
            formatDraftSummary(draft),
          ]
            .filter(Boolean)
            .join('\n'),
          actions: [
            {
              id: 'create_session',
              label: 'Réessayer avec ces infos',
              toolId: this.id,
              style: 'secondary',
              payload: { ...draft },
            },
            openFormAction(draft),
          ],
        },
        payload: draft as Record<string, unknown>,
      };
    }

    const summary = [
      'Je peux créer cette séance :',
      `• Type : ${draft.typeLabel ?? labelForType(draft.type!)}`,
      `• Date : ${draft.sessionDate} · ${draft.startTime ?? '09:00'}–${draft.endTime ?? '10:00'}`,
      `• Établissement : ${draft.establishmentLabel ?? draft.establishmentId}`,
      `• Matière : ${draft.subjectLabel ?? draft.subjectId}`,
      `• Tuteurs : ${(draft.tutorIds ?? []).length} · Élèves : ${(draft.studentIds ?? []).length}`,
      '',
      'Confirmez pour appeler l’API Ednov, ou ouvrez le formulaire pour ajuster.',
    ].join('\n');

    if (
      input.actionId === 'create_session' &&
      (input.payload?.confirmed || input.payload?.alreadyConfirmed)
    ) {
      return {
        ok: true,
        payload: {
          ...draft,
          startTime: draft.startTime ?? '09:00',
          endTime: draft.endTime ?? '10:00',
        },
      };
    }

    return {
      ok: true,
      confirmation: {
        summary,
        payload: {
          ...draft,
          startTime: draft.startTime ?? '09:00',
          endTime: draft.endTime ?? '10:00',
        },
        preview: {
          title: 'Création de séance',
          entities: [
            {
              type: 'session',
              label: `${draft.typeLabel ?? labelForType(draft.type!)} · ${draft.sessionDate}`,
            },
            {
              type: 'establishment',
              label: String(
                draft.establishmentLabel ?? draft.establishmentId ?? '—',
              ),
            },
            {
              type: 'subject',
              label: String(draft.subjectLabel ?? draft.subjectId ?? '—'),
            },
            {
              type: 'participants',
              label: `${(draft.tutorIds ?? []).length} tuteur(s), ${(draft.studentIds ?? []).length} élève(s)`,
            },
          ],
          warnings:
            (draft.tutorIds ?? []).length === 0 ||
            (draft.studentIds ?? []).length === 0
              ? ['Participants incomplets — vérifiez tuteurs et élèves.']
              : undefined,
        },
      },
    };
  }
}

export function isCreateSessionIntent(message: string): boolean {
  return matchesAny(message, [
    /\b(cr[ée]er?|crée|cree|create|planifi(?:er|e)|ajouter|add|nouvelle?)\b.{0,40}\b(s[ée]ance|seance|session)s?\b/i,
    /\b(s[ée]ance|seance|session)s?\b.{0,20}\b(cr[ée]er?|crée|cree|create|planifi(?:er|e))\b/i,
    /\baide[- ]moi à cr[ée]er (une )?s[ée]ance\b/i,
    /\baide[- ]moi a creer (une )?seance\b/i,
  ]);
}

export function isCancelSessionIntent(message: string): boolean {
  return matchesAny(message, [
    /\b(annuler|cancel)\b.{0,40}\b(s[ée]ance|seance|session)s?\b/i,
    /\b(s[ée]ance|seance|session)s?\b.{0,20}\b(annuler|cancel)\b/i,
  ]);
}

function openFormAction(draft: SessionDraft): ToolActionButton {
  return {
    id: 'open_create_form',
    label: 'Ouvrir le formulaire',
    toolId: 'session',
    style: 'secondary',
    payload: { ...draft, openCreateForm: true },
  };
}

function labelForType(type: string): string {
  return SESSION_TYPES.find((row) => row.id === type)?.label ?? type;
}

function formatDraftSummary(draft?: SessionDraft): string {
  if (!draft) return '';
  const lines = [
    draft.type ? `Type : ${draft.typeLabel ?? labelForType(draft.type)}` : null,
    draft.establishmentId
      ? `Établissement : ${draft.establishmentLabel ?? draft.establishmentId}`
      : null,
    draft.subjectId
      ? `Matière : ${draft.subjectLabel ?? draft.subjectId}`
      : null,
    draft.sessionDate
      ? `Date : ${draft.sessionDate} ${draft.startTime ?? ''}–${draft.endTime ?? ''}`.trim()
      : null,
  ].filter(Boolean);
  return lines.length ? `Brouillon :\n${lines.map((l) => `• ${l}`).join('\n')}` : '';
}

function missingRequiredFields(draft: SessionDraft): string[] {
  const missing: string[] = [];
  if (!draft.type) missing.push('type de séance');
  if (!draft.establishmentId) missing.push('établissement');
  if (!draft.subjectId) missing.push('matière');
  if (!draft.sessionDate) missing.push('date (AAAA-MM-JJ)');
  if (!draft.startTime) missing.push('heure de début (HH:mm)');
  if (!draft.endTime) missing.push('heure de fin (HH:mm)');
  const facilitators = [
    ...(draft.tutorIds ?? []),
    ...(draft.volunteerIds ?? []),
  ];
  if (!facilitators.length) missing.push('au moins un tuteur ou VSC');
  if (!(draft.studentIds ?? []).length) missing.push('au moins un élève');
  return missing;
}

function mergeDraft(
  ...parts: Array<Partial<SessionDraft> | undefined>
): SessionDraft {
  const out: SessionDraft = {};
  for (const part of parts) {
    if (!part) continue;
    Object.assign(out, Object.fromEntries(
      Object.entries(part).filter(([, value]) => value !== undefined && value !== ''),
    ));
  }
  return out;
}

function parseDraftFromMessage(message: string): Partial<SessionDraft> {
  const draft: Partial<SessionDraft> = {};

  const dateMatch =
    /\b(20\d{2}-\d{2}-\d{2})\b/.exec(message) ||
    /\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2})\b/.exec(message);
  if (dateMatch) {
    if (dateMatch[0].includes('-')) {
      draft.sessionDate = dateMatch[1];
    } else {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      draft.sessionDate = `${dateMatch[3]}-${month}-${day}`;
    }
  }

  const timeRange =
    /\b(?:de\s+)?(\d{1,2}:\d{2})\s*(?:à|a|-|–|—)\s*(\d{1,2}:\d{2})\b/i.exec(
      message,
    );
  if (timeRange) {
    draft.startTime = normalizeTime(timeRange[1]);
    draft.endTime = normalizeTime(timeRange[2]);
  }

  for (const row of SESSION_TYPES) {
    if (message.toLowerCase().includes(row.label.toLowerCase()) || message.includes(row.id)) {
      draft.type = row.id;
      draft.typeLabel = row.label;
      break;
    }
  }
  if (!draft.type && /\b(tutorat individuel|individual)\b/i.test(message)) {
    draft.type = 'individual_tutoring';
    draft.typeLabel = 'Tutorat individuel';
  }

  const tutorIds = extractUuidList(message, /tuteur(?:s)?\s*[:=]?\s*([0-9a-f,-;\s]+)/i);
  const studentIds = extractUuidList(
    message,
    /(?:[ée]l[èe]ve|eleve|student)s?\s*[:=]?\s*([0-9a-f,-;\s]+)/i,
  );
  if (tutorIds.length) draft.tutorIds = tutorIds;
  if (studentIds.length) draft.studentIds = studentIds;

  return draft;
}

function extractUuidList(message: string, pattern: RegExp): string[] {
  const match = pattern.exec(message);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter((part) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        part,
      ),
    );
}

function normalizeTime(value: string): string {
  const [h, m] = value.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}
