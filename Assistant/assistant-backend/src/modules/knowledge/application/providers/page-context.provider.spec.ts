import { PageContextKnowledgeSource } from './page-context.provider';
import type { ApplicationContext } from '../../../integration/request-context';

describe('PageContextKnowledgeSource', () => {
  const source = new PageContextKnowledgeSource();

  it('resolves pronouns to the focused student and lists comparison entities', () => {
    const ctx: ApplicationContext = {
      page: { route: '/app/students', title: 'Students', interfaceId: 'students' },
      selection: {
        primary: {
          type: 'student',
          id: 's1',
          label: 'Mohamed Ben Ali',
          company: 'ZUPdeCo',
          role: 'student',
        },
        entities: [
          { type: 'student', id: 's1', label: 'Mohamed Ben Ali' },
          { type: 'student', id: 's2', label: 'Léa Martin' },
        ],
      },
      student: { type: 'student', id: 's1', label: 'Mohamed Ben Ali' },
      focus: { pinned: true, source: 'manual', scope: 'comparison' },
    };

    const text = source.formatContext(ctx);
    expect(text).toMatch(/Mohamed Ben Ali/);
    expect(text).toMatch(/Léa Martin/);
    expect(text).toMatch(/COMPARISON/);
    expect(text).toMatch(/he\/she\/they/i);
    expect(text).not.toMatch(/GLOBAL/);
  });

  it('describes global scope when no entity is focused', () => {
    const ctx: ApplicationContext = {
      page: { route: '/app/dashboard', title: 'Dashboard' },
      focus: { scope: 'global' },
    };
    const text = source.formatContext(ctx);
    expect(text).toMatch(/GLOBAL/);
  });

  it('resolves this session and this establishment without repeating names', () => {
    const sessionText = source.formatContext({
      page: { route: '/app/sessions', title: 'Sessions', interfaceId: 'sessions' },
      selection: {
        primary: {
          type: 'session',
          id: 'sess-12',
          label: 'Session 12/08',
          role: 'session',
        },
      },
      session: { type: 'session', id: 'sess-12', label: 'Session 12/08' },
      focus: { scope: 'entity', source: 'page' },
    });
    expect(sessionText).toMatch(/Session 12\/08/);
    expect(sessionText).toMatch(/cette séance/i);
    expect(sessionText).toMatch(/ENTITY/);

    const schoolText = source.formatContext({
      page: {
        route: '/app/establishments',
        title: 'Establishments',
        interfaceId: 'establishments',
      },
      selection: {
        primary: {
          type: 'establishment',
          id: 'e1',
          label: 'Collège Paul Claudel',
          role: 'establishment',
        },
      },
      establishment: {
        type: 'establishment',
        id: 'e1',
        label: 'Collège Paul Claudel',
      },
      focus: { scope: 'entity', source: 'page' },
    });
    expect(schoolText).toMatch(/Collège Paul Claudel/);
    expect(schoolText).toMatch(/cet établissement/i);
  });
});
