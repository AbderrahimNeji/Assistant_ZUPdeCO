import { ResultMerger } from './result-merger';
import type { BusinessIntelligencePlan, SkillResult } from '../skill.types';

describe('ResultMerger', () => {
  const merger = new ResultMerger();

  const plan: BusinessIntelligencePlan = {
    questionType: 'COUNT',
    skillIds: ['student', 'dashboard'],
    domains: ['student', 'dashboard'],
    rationale: 'test',
  };

  it('merges facts and builds transparency', () => {
    const results: SkillResult[] = [
      {
        skillId: 'student',
        ok: true,
        operation: 'count',
        data: { studentsCount: 42 },
        facts: ['Student count: 42.'],
      },
      {
        skillId: 'dashboard',
        ok: true,
        operation: 'stats',
        data: { tutorsCount: 10 },
        facts: ['Tutor count: 10.'],
      },
    ];

    const out = merger.merge(plan, results, { classificationConfidence: 0.9 });
    expect(out.mergedFacts.join('\n')).toContain('Question category: COUNT');
    expect(out.mergedFacts.join('\n')).toContain('Student count: 42.');
    expect(out.mergedFacts.join('\n')).toContain(
      'Current situation → Required / satisfied conditions',
    );
    expect(out.mergedFacts.join('\n')).toContain('direct answer');
    expect(out.transparency.dataSource).toBe('ednov_live');
    expect(out.transparency.skillsSucceeded).toEqual(['student', 'dashboard']);
    expect(out.transparency.partial).toBe(false);
    expect(out.transparency.freshness).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(out.businessVisual?.kpis?.length).toBeGreaterThan(0);
  });

  it('marks partial when one skill fails', () => {
    const results: SkillResult[] = [
      {
        skillId: 'student',
        ok: true,
        operation: 'count',
        data: { studentsCount: 3 },
        facts: ['Student count: 3.'],
      },
      {
        skillId: 'dashboard',
        ok: false,
        operation: 'timeout',
        data: null,
        facts: [],
        warnings: ['Skill dashboard timed out after 8000ms'],
      },
    ];

    const out = merger.merge(plan, results, { classificationConfidence: 0.85 });
    expect(out.transparency.partial).toBe(true);
    expect(out.transparency.skillsFailed).toEqual(['dashboard']);
    expect(out.mergedFacts.join('\n')).toContain('partial response');
    expect(out.mergedFacts.join('\n')).toContain('Student count: 3.');
    expect(out.mergedFacts.join('\n')).toContain(
      '(no facts — skill unavailable)',
    );
  });

  it('states unavailability when all skills fail', () => {
    const results: SkillResult[] = [
      {
        skillId: 'student',
        ok: false,
        operation: 'error',
        data: null,
        facts: [],
        warnings: ['boom'],
      },
    ];

    const out = merger.merge({ ...plan, skillIds: ['student'] }, results, {
      classificationConfidence: 0.7,
    });
    expect(out.transparency.partial).toBe(true);
    expect(out.mergedFacts.join('\n')).toContain(
      'No live business facts could be retrieved',
    );
  });

  it('parses markdown tables into businessVisual', () => {
    const results: SkillResult[] = [
      {
        skillId: 'statistics',
        ok: true,
        operation: 'statistics_bundle',
        data: null,
        facts: [
          '### KPI snapshot',
          '| Metric | Value |',
          '| --- | ---: |',
          '| students | 12 |',
          '| tutors | 4 |',
        ],
      },
    ];

    const out = merger.merge(
      {
        questionType: 'STATISTICS',
        skillIds: ['statistics'],
        rationale: 'test',
      },
      results,
    );
    expect(out.businessVisual?.tables?.[0]?.rows.length).toBe(2);
  });
});
