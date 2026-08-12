import { buildSourceAttributions } from './source-attribution';
import type { KnowledgeSnippet } from './knowledge.types';

describe('buildSourceAttributions', () => {
  it('aggregates document pages and maps application providers', () => {
    const snippets: KnowledgeSnippet[] = [
      {
        source: 'document_kb',
        title: 'handbook.pdf',
        content: 'secret chunk',
        page: 3,
      },
      {
        source: 'document_kb',
        title: 'handbook.pdf',
        content: 'another secret',
        page: 5,
      },
      {
        source: 'document_kb',
        title: 'handbook.pdf',
        content: 'middle',
        page: 4,
      },
      {
        source: 'documentation_kb',
        title: 'Documentation Fonctionnelle ZupdeCo › VF-1.1',
        documentName: 'Documentation Fonctionnelle ZupdeCo',
        content: 'doc secret',
        page: 1,
        chapter: 'VF-1.1 — PARCOURS TUTEUR',
        section: '1. Rôle du tuteur',
      },
      {
        source: 'conversation_attachments',
        title: 'notes.txt',
        content: 'attachment body',
        page: 1,
      },
      {
        source: 'application_db',
        title: 'application:course',
        content: 'Courses: ...',
        providerId: 'course',
      },
      {
        source: 'application_db',
        title: 'application:user_profile',
        content: 'User profile...',
        providerId: 'user_profile',
      },
    ];

    const sources = buildSourceAttributions(snippets, [
      'course',
      'user_profile',
    ]);

    expect(sources).toEqual([
      {
        kind: 'conversation_attachment',
        label: 'notes.txt',
        icon: '📄',
        document: 'notes.txt',
      },
      {
        kind: 'documentation_kb',
        label: 'Documentation Fonctionnelle ZupdeCo',
        icon: '📘',
        pages: [1],
        chapter: 'VF-1.1 — PARCOURS TUTEUR',
        section: '1. Rôle du tuteur',
        providerId: 'documentation',
        document: 'Documentation Fonctionnelle ZupdeCo',
        page: 1,
      },
      {
        kind: 'document_kb',
        label: 'handbook.pdf',
        icon: '📄',
        pages: [3, 4, 5],
        document: 'handbook.pdf',
        page: 3,
      },
      {
        kind: 'application_db',
        label: 'Courses Database',
        icon: '🎓',
        providerId: 'course',
        document: 'Courses Database',
      },
      {
        kind: 'application_db',
        label: 'User Profile',
        icon: '👤',
        providerId: 'user_profile',
        document: 'User Profile',
      },
    ]);

    expect(JSON.stringify(sources)).not.toContain('secret');
    expect(JSON.stringify(sources)).not.toContain('attachment body');
  });
});
