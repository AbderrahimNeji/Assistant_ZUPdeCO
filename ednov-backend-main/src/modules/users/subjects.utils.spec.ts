import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { appendUserProfileSubjectJsonbFilter, profileHasSubject } from './subjects.utils';

describe('profileHasSubject', () => {
  it('matches UUID string case-insensitively', () => {
    expect(profileHasSubject(['aaa-bbbb-cccc-dddd-eeeeeeeeeeee'], 'AAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(
      true,
    );
  });

  it('matches object with id', () => {
    expect(
      profileHasSubject([{ id: 'aaa-bbbb-cccc-dddd-eeeeeeeeeeee', label: 'Math' }], 'aaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
    ).toBe(true);
  });

  it('returns false when no overlap', () => {
    expect(profileHasSubject(['11111111-1111-1111-1111-111111111111'], '22222222-2222-2222-2222-222222222222')).toBe(
      false,
    );
  });

  it('returns true when subjectId is null', () => {
    expect(profileHasSubject([], null)).toBe(true);
  });
});

describe('appendUserProfileSubjectJsonbFilter', () => {
  it('registers jsonb EXISTS filter with lowercased ids', () => {
    const andWhere = jest.fn();
    const qb = { andWhere } as unknown as SelectQueryBuilder<ObjectLiteral>;
    appendUserProfileSubjectJsonbFilter(qb, ['AAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'], { paramSuffix: 't' });
    expect(andWhere).toHaveBeenCalledTimes(1);
    const [sql, params] = andWhere.mock.calls[0] as [string, Record<string, string[]>];
    expect(sql).toContain('jsonb_array_elements');
    expect(sql).toContain('"userProfile"."subjects"');
    expect(params).toEqual({ subjectFilterIds_t: ['aaa-bbbb-cccc-dddd-eeeeeeeeeeee'] });
  });

  it('uses custom profile alias in SQL', () => {
    const andWhere = jest.fn();
    const qb = { andWhere } as unknown as SelectQueryBuilder<ObjectLiteral>;
    appendUserProfileSubjectJsonbFilter(qb, ['11111111-1111-1111-1111-111111111111'], {
      profileAlias: 'up',
      paramSuffix: 'x',
    });
    const [sql] = andWhere.mock.calls[0] as [string];
    expect(sql).toContain('"up"."subjects"');
  });

  it('does nothing when subjectIds is empty', () => {
    const andWhere = jest.fn();
    appendUserProfileSubjectJsonbFilter({ andWhere } as unknown as SelectQueryBuilder<ObjectLiteral>, []);
    expect(andWhere).not.toHaveBeenCalled();
  });
});
