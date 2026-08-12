export type CopilotErrorKind =
  | 'offline'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'server'
  | 'aborted'
  | 'unknown';

export type MappedCopilotError = {
  kind: CopilotErrorKind;
  /** Prefer French for the in-app UI. */
  messageFr: string;
  messageEn: string;
  /** Combined bilingual line for display. */
  display: string;
  retryable: boolean;
};

const MESSAGES: Record<
  Exclude<CopilotErrorKind, 'aborted'>,
  { fr: string; en: string; retryable: boolean }
> = {
  offline: {
    fr: 'Assistant hors ligne — vérifiez votre connexion ou que le service tourne (port 3001).',
    en: 'Assistant offline — check your network or that the service is running (port 3001).',
    retryable: true,
  },
  timeout: {
    fr: 'Délai dépassé — le serveur met trop de temps à répondre.',
    en: 'Request timed out — the server took too long to respond.',
    retryable: true,
  },
  unauthorized: {
    fr: 'Session expirée ou non autorisée — reconnectez-vous.',
    en: 'Session expired or unauthorized — please sign in again.',
    retryable: false,
  },
  forbidden: {
    fr: 'Accès refusé — vous n’avez pas la permission pour cette action.',
    en: 'Access denied — you do not have permission for this action.',
    retryable: false,
  },
  server: {
    fr: 'Erreur serveur de l’assistant — réessayez dans un instant.',
    en: 'Assistant server error — please try again shortly.',
    retryable: true,
  },
  unknown: {
    fr: 'Une erreur inattendue est survenue.',
    en: 'An unexpected error occurred.',
    retryable: true,
  },
};

function bilingual(kind: Exclude<CopilotErrorKind, 'aborted'>): MappedCopilotError {
  const m = MESSAGES[kind];
  return {
    kind,
    messageFr: m.fr,
    messageEn: m.en,
    display: `${m.fr} / ${m.en}`,
    retryable: m.retryable,
  };
}

export function mapCopilotError(error: unknown): MappedCopilotError {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name?: string }).name);
    if (name === 'AbortError') {
      return {
        kind: 'aborted',
        messageFr: 'Requête annulée.',
        messageEn: 'Request cancelled.',
        display: 'Requête annulée. / Request cancelled.',
        retryable: false,
      };
    }
  }

  const status =
    typeof error === 'object' && error && 'status' in error
      ? Number((error as { status?: number }).status)
      : undefined;
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code)
      : undefined;
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const lower = raw.toLowerCase();

  if (
    code === 'ECONNABORTED' ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('délai')
  ) {
    return bilingual('timeout');
  }

  if (status === 401 || lower.includes('not authenticated') || lower.includes('session expired')) {
    return bilingual('unauthorized');
  }

  if (status === 403) {
    return bilingual('forbidden');
  }

  if (
    status !== undefined &&
    status >= 500
  ) {
    return bilingual('server');
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('err_connection') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    code === 'ERR_NETWORK'
  ) {
    return bilingual('offline');
  }

  if (status !== undefined && status >= 400) {
    return bilingual('server');
  }

  if (raw.trim() && !/^failed to fetch$/i.test(raw.trim())) {
    const mapped = bilingual('unknown');
    return {
      ...mapped,
      display: `${raw.trim()} — ${mapped.messageFr} / ${mapped.messageEn}`,
    };
  }

  return bilingual('unknown');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter: 400ms → 800 → 1600… capped. */
export function backoffDelay(attempt: number, baseMs = 400, maxMs = 6_000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.2));
  return exp + jitter;
}
