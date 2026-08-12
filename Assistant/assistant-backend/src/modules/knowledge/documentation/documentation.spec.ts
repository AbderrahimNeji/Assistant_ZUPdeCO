import { DocumentationChunkerService } from './documentation-chunker.service';
import { QuestionRouterService } from './question-router.service';
import { DocumentationCitationService } from './documentation-citation.service';
import type { DocumentationHit } from './documentation.types';

describe('QuestionRouterService', () => {
  const router = new QuestionRouterService();

  it('routes functional definition questions to documentation', () => {
    const plan = router.route("Qu'est-ce qu'un tuteur ?");
    expect(plan.intent).toBe('functional');
    expect(plan.useDocumentation).toBe(true);
    expect(plan.useBusiness).toBe(false);
  });

  it('routes counting questions to business', () => {
    const plan = router.route('Combien d’élèves actifs ?');
    expect(plan.intent).toBe('business');
    expect(plan.useBusiness).toBe(true);
    expect(plan.useDocumentation).toBe(false);
  });

  it('routes hybrid matching diagnosis questions to both', () => {
    const plan = router.route(
      "Pourquoi cet élève ne peut pas être matché ?",
    );
    expect(plan.intent).toBe('hybrid');
    expect(plan.useDocumentation).toBe(true);
    expect(plan.useBusiness).toBe(true);
  });

  it('routes onboarding how-to to documentation', () => {
    const plan = router.route('Comment fonctionne le matching ?');
    expect(plan.intent).toBe('functional');
    expect(plan.useDocumentation).toBe(true);
  });

  it('routes how-to create comptes-rendus to documentation', () => {
    for (const q of [
      'comment creer des comptes rendues',
      'comment créer des comptes-rendus',
      'Comment créer un compte rendu ?',
      'How do I create a session report?',
    ]) {
      const plan = router.route(q);
      expect(plan.intent).toBe('functional');
      expect(plan.useDocumentation).toBe(true);
      expect(plan.useBusiness).toBe(false);
    }
  });

  it('routes tutor onboarding and parent process questions to documentation', () => {
    for (const q of [
      'Comment onboarde-t-on un tuteur ?',
      'Quelles sont les étapes d’inscription parent ?',
      'Que voit le parent dans Mes comptes rendus ?',
      'Tutor onboarding steps',
    ]) {
      const plan = router.route(q);
      expect(plan.useDocumentation).toBe(true);
    }
  });

  it.each([
    'What is the next session?',
    'Who participates in the next session?',
    'Show upcoming sessions',
    'Open the profile of Mohamed',
    'Open Mohamed',
    'Open this student',
    'Show this student\'s profile',
    'Show tutor profile',
    'Why isn\'t this student matched?',
    'Why can\'t Mohamed be matched?',
    'Who can be matched with this student?',
    'Who is waiting for a tutor?',
    'What is the next session?',
    'Which establishment has the most students?',
    'Which establishment has the most sessions?',
    'List reports awaiting validation',
    'Quels comptes-rendus sont encore en attente de validation',
    'Show unmatched students',
    'Which tutor has the highest workload?',
    "Who attended today's session?",
    'Which reports are missing?',
    'Which students joined this month?',
    'How many active tutors?',
    'Which coordinator manages this establishment?',
    "Show today's schedule",
    'Which sessions are cancelled?',
    'How many students?',
    'Active students',
    'Inactive students',
    'Students without tutor',
    'Students without reports',
    'Students by establishment',
    'Students registered today',
    'Most active tutors',
    'Tutors without students',
    'Tutor workload',
    'Tutor availability',
    "Today's sessions",
    "Tomorrow's sessions",
    'Cancelled sessions',
    'Completed sessions',
    'Upcoming sessions',
    'Missing reports',
    'Validated reports',
    'Pending reports',
    'Reports by tutor',
    'Students without matching',
    'Tutors available',
    "Today's KPIs",
    'Most active establishment',
    'Least active establishment',
    'Attendance trend',
    'Session evolution',
    'Tutor activity',
    'Student activity',
    'Quels établissements sont les plus actifs ?',
    'Quel établissement est le plus actif ?',
    'Quel établissement est le plus actif et pourquoi',
    'Classe les établissements.',
    'Top établissements.',
    'Most active establishments.',
    'Top schools.',
  ])('routes live operational question to business: %s', (question) => {
    const plan = router.route(question);
    expect(plan.useBusiness).toBe(true);
    expect(plan.intent).not.toBe('functional');
  });
});

describe('expandDocumentationQuery', () => {
  // Lazy require keeps this file free of circular imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { expandDocumentationQuery } = require('./documentation-query-expand') as {
    expandDocumentationQuery: (q: string) => string;
  };

  it('expands CR how-to questions toward auto-generation rules', () => {
    const out = expandDocumentationQuery('comment creer des comptes rendues');
    expect(out).toContain('créé automatiquement');
    expect(out).toContain('Génération du compte rendu');
  });

  it('expands parent / onboarding / scoring process questions', () => {
    expect(expandDocumentationQuery('Comment un parent ajoute-t-il un élève ?')).toMatch(
      /parcours parent/i,
    );
    expect(expandDocumentationQuery('Comment onboarde-t-on un tuteur ?')).toMatch(
      /onboarding tuteur/i,
    );
    expect(expandDocumentationQuery('Le scoring bloque-t-il un flux métier ?')).toMatch(
      /ne bloque pas/i,
    );
  });

  it('leaves unrelated questions unchanged', () => {
    expect(expandDocumentationQuery('Combien d’élèves actifs ?')).toBe(
      'Combien d’élèves actifs ?',
    );
  });
});

describe('DocumentationChunkerService', () => {
  const chunker = new DocumentationChunkerService();

  it('preserves chapter/section hierarchy and page metadata', async () => {
    const drafts = await chunker.chunkPages([
      {
        page: 1,
        text: [
          'VF-1.1 — PARCOURS TUTEUR',
          'Version Finale',
          '1. Rôle du tuteur dans Zupdeco',
          'Le tuteur est un bénévole qui accompagne un ou plusieurs élèves.',
          'Il ne décide ni des binômes, ni des séances.',
        ].join('\n'),
      },
      {
        page: 4,
        text: [
          '3.4 Statut après questionnaire',
          'Une fois le questionnaire validé :',
          '• le tuteur passe en statut Lead qualifié,',
          '• les étapes d’onboarding deviennent visibles.',
        ].join('\n'),
      },
    ]);

    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.some((d) => d.chapter.includes('VF-1.1'))).toBe(true);
    expect(drafts.some((d) => /Rôle du tuteur|Lead qualifié|questionnaire/i.test(d.content))).toBe(
      true,
    );
    expect(drafts.every((d) => d.page >= 1)).toBe(true);
    expect(drafts.every((d) => d.keywords.length > 0)).toBe(true);
  });
});

describe('DocumentationCitationService', () => {
  const citations = new DocumentationCitationService();

  const hit: DocumentationHit = {
    id: 'c1',
    content: 'Le tuteur est un bénévole.',
    score: 0.9,
    semanticScore: 0.9,
    keywordScore: 0.8,
    page: 1,
    chapter: 'VF-1.1 — PARCOURS TUTEUR',
    section: '1. Rôle du tuteur dans Zupdeco',
    title: '1. Rôle du tuteur dans Zupdeco',
    keywords: ['tuteur'],
    documentName: 'Documentation Fonctionnelle ZupdeCo',
    documentSlug: 'zupdeco-functional',
  };

  it('formats product-knowledge blocks without citation headers', () => {
    const block = citations.formatContextBlock(hit);
    expect(block).toContain('Product knowledge');
    expect(block).toContain('VF-1.1 — PARCOURS TUTEUR');
    expect(block).toContain('Le tuteur est un bénévole.');
    expect(block).not.toContain('Document: Documentation Fonctionnelle');
    expect(block).not.toContain('Page: 1');
  });

  it('enriches knowledge snippets for the UI', () => {
    const snippet = citations.enrichSnippet(hit, 'documentation_kb');
    expect(snippet.source).toBe('documentation_kb');
    expect(snippet.page).toBe(1);
    expect(snippet.chapter).toContain('VF-1.1');
    expect(snippet.providerId).toBe('documentation');
  });
});
