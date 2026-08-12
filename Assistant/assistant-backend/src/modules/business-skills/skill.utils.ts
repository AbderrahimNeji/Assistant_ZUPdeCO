/** Extract a probable person name from natural language (FR/EN). */
export function extractPersonName(question: string): string | null {
  const patterns = [
    /\b(?:profil(?:e)?|fiche)\s+(?:of|de|du|d['’])\s*([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/iu,
    /\b(?:open|ouvre|ouvrir|show|montre|affiche)\s+(?:the\s+)?(?:profil(?:e)?|fiche)\s+(?:of|de)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/iu,
    /\b(?:open|ouvre|ouvrir|show|montre|affiche)\s+(?:the\s+)?(?:student|élève|eleve|tutor|tuteur|tuteure)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/iu,
    /\b(?:open|ouvre|ouvrir|show|montre|affiche)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/iu,
    /\b(?:student|élève|eleve|tutor|tuteur|tuteure)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/u,
    /\b(?:named|called|nommé|nommee|nommée)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/iu,
    /\b([A-ZÀ-Ÿ][\wÀ-ÿ'-]+\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/u,
  ];
  for (const pattern of patterns) {
    const match = question.match(pattern);
    const name = match?.[1]?.trim();
    if (!name) continue;
    if (/^(this|cet|cette|the|le|la|les|un|une|profil|profile|fiche)$/i.test(name)) {
      continue;
    }
    return name;
  }
  return null;
}

export function asksOpenOrShowProfile(question: string): boolean {
  return /\b(open|ouvre|ouvrir|show|montre|affiche|fiche|profil(?:e)?)\b/i.test(
    question,
  );
}

/** Structured facts the LLM must preserve (direct answer → sources). */
export function answerFacts(input: {
  answer: string;
  explanation?: string;
  reasoning?: string;
  next?: string;
  source: string;
  extra?: string[];
}): string[] {
  return [
    `DIRECT ANSWER: ${input.answer}`,
    input.explanation ? `EXPLANATION: ${input.explanation}` : '',
    input.reasoning ? `BUSINESS REASONING: ${input.reasoning}` : '',
    input.next ? `NEXT ACTION: ${input.next}` : '',
    `SOURCE: ${input.source}`,
    ...(input.extra ?? []),
  ].filter(Boolean);
}

export function displayName(row: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const full = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim();
  if (full) return full;
  if (row.displayName?.trim()) return row.displayName.trim();
  // Never fall back to email in assistant-facing labels
  return 'Unknown';
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Ednov request failed';
}

/** Map internal REST labels to human module names for LLM / UI facts. */
export function humanizeApiSource(source: string): string {
  const s = source?.trim() || 'Ednov';
  if (!/\b(?:GET|POST|PUT|PATCH|DELETE)\b|\//i.test(s)) return s;
  if (/student-tutor-pairs|matching/i.test(s)) return 'Matching';
  if (/report-kpis|\/reports|compte.?rendu/i.test(s)) return 'Comptes-rendus';
  if (/\/tutors/i.test(s)) return 'Tuteurs';
  if (/\/students/i.test(s)) return 'Élèves';
  if (/\/sessions/i.test(s)) return 'Séances';
  if (/onboarding/i.test(s)) return 'Onboarding';
  if (/establishments/i.test(s)) return 'Établissements';
  if (/gamification/i.test(s)) return 'Gamification';
  if (/\/search/i.test(s)) return 'Recherche';
  if (/vsc/i.test(s)) return 'Rapports VSC';
  return s.replace(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9_\-/{:}?&=%.]+/gi, 'données Ednov');
}

/**
 * User-safe facts when a live Ednov call times out or fails.
 * Never maps to “I couldn’t find the information in documents”.
 */
export function apiPartialFacts(source: string, error?: unknown): string[] {
  const label = humanizeApiSource(source);
  const message = error ? safeErrorMessage(error) : 'The live API did not respond.';
  const timedOut = /timeout|timed out|etimedout/i.test(message);
  return answerFacts({
    answer: timedOut
      ? `Live ${label} data could not be retrieved in time — this is a timeout, not missing information.`
      : `Live ${label} data is incomplete because an Ednov call failed.`,
    explanation: timedOut
      ? 'The live Ednov request timed out.'
      : 'The live Ednov request failed.',
    reasoning:
      'A timeout or partial API failure is not a documentation gap. Answer with any live facts already retrieved, and say which slice could not be loaded. Never mention HTTP methods or API paths.',
    next: 'Retry the question, or open the related Ednov page and ask again.',
    source: label,
  });
}

export function isDeicticEstablishmentQuestion(question: string): boolean {
  return /\b(cet établissement|cet etablissement|this (establishment|school)|focused establishment)\b/i.test(
    question,
  );
}

/** Grounded ranking + why, so “et pourquoi” does not fall back to RAG refusal. */
export function establishmentActivityFacts(input: {
  rank: {
    primary: {
      best: { establishment: string; value: number; metric: string };
      worst: { establishment: string; value: number; metric: string };
      ranked: Array<{ establishment: string; value: number }>;
    };
    byCompleted: {
      ranked: Array<{ establishment: string; value: number }>;
    } | null;
    byStudents: {
      best: { establishment: string; value: number };
      ranked: Array<{ establishment: string; value: number }>;
    } | null;
    metricLabel: string;
    why: string;
  } | null;
  preferLeast: boolean;
}): string[] {
  const { rank, preferLeast } = input;
  if (!rank) {
    return answerFacts({
      answer:
        'Live establishment activity ranking is unavailable from Dashboard charts (empty or failed). Do not invent a school name.',
      explanation:
        'GET /dashboard/charts returned no usable sessions/resources series for this user scope.',
      reasoning:
        'Without that chart, establishments cannot be compared on activity. This is not a documentation gap.',
      next: 'Open Dashboard → graphiques par établissement, then ask again.',
      source: 'Dashboard (GET /dashboard/charts)',
    });
  }

  const winner = preferLeast ? rank.primary.worst : rank.primary.best;
  const allZero = rank.primary.ranked.every((r) => r.value === 0);
  if (allZero) {
    return answerFacts({
      answer:
        'Dashboard charts loaded, but every establishment in the sample has 0 on the activity metric — no most/least active school can be named.',
      explanation: rank.why,
      reasoning:
        'A flat zero ranking means no delivered session volume in the chart window (authorization-scoped, typically top 10 by volume).',
      next: 'Widen the Dashboard date range or open Sessions.',
      source: 'Dashboard (GET /dashboard/charts)',
    });
  }

  const rows = preferLeast
    ? [...rank.primary.ranked].reverse().slice(0, 10)
    : rank.primary.ranked.slice(0, 10);
  const studentsNote = rank.byStudents
    ? ` Supporting volume: ${rank.byStudents.best.establishment} has the most students in sessions (${rank.byStudents.best.value}).`
    : '';

  return answerFacts({
    answer: preferLeast
      ? `The least active establishment is ${winner.establishment} (${winner.value} ${rank.metricLabel}).`
      : `The most active establishment is ${winner.establishment} (${winner.value} ${rank.metricLabel}).`,
    explanation: `${rank.why} ${winner.establishment} ranks ${preferLeast ? 'lowest' : 'highest'} on that live metric — that is why.${studentsNote}`,
    reasoning:
      'Higher session (or student-in-session) volume means more tutoring activity delivered at that school in the Dashboard period. This is not an attendance-rate ranking.',
    next: `Open Dashboard charts, or open the establishment “${winner.establishment}” to inspect sessions.`,
    source: 'Dashboard (GET /dashboard/charts)',
    extra: [
      'If the user asked why / pourquoi: use the metric definition above. Do not reply that the information was not found.',
      '',
      '### Ranking',
      '| Rank | Establishment | Value |',
      '| ---: | --- | ---: |',
      ...rows.map((r, i) => `| ${i + 1} | ${r.establishment} | ${r.value} |`),
    ],
  });
}
