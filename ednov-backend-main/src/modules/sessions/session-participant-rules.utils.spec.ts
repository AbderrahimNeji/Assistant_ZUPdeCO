import { isVolunteerRoleEntity, userHasVolunteerRole } from './session-participant-rules.utils';

describe('session-participant-rules.utils', () => {
  it('detects volunteers role group', () => {
    expect(isVolunteerRoleEntity({ roleGroup: 'volunteers', code: 'custom' })).toBe(true);
  });

  it('detects VSC role codes', () => {
    expect(isVolunteerRoleEntity({ roleGroup: 'tutors', code: 'VSC' })).toBe(true);
  });

  it('userHasVolunteerRole returns false without volunteer roles', () => {
    expect(
      userHasVolunteerRole({
        userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }],
      }),
    ).toBe(false);
  });
});
