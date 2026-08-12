import {
  deriveSessionPairsFromCreateInput,
  validatePairsForSessionType,
} from './session-pairs.utils';

describe('session-pairs.utils', () => {
  describe('deriveSessionPairsFromCreateInput', () => {
    it('returns cartesian product for whole_class', () => {
      const pairs = deriveSessionPairsFromCreateInput(
        'whole_class',
        ['t1', 't2'],
        ['s1', 's2', 's3'],
      );
      expect(pairs).toHaveLength(6);
    });
  });

  describe('validatePairsForSessionType', () => {
    it('allows multiple tutors per student for whole_class', () => {
      expect(
        validatePairsForSessionType('whole_class', [
          { studentUserId: 'a', tutorUserId: 'x' },
          { studentUserId: 'a', tutorUserId: 'y' },
        ]),
      ).toBeNull();
    });

    it('rejects two tutors for same student on homework_help', () => {
      expect(
        validatePairsForSessionType('homework_help', [
          { studentUserId: 'a', tutorUserId: 'x' },
          { studentUserId: 'a', tutorUserId: 'y' },
        ]),
      ).not.toBeNull();
    });
  });
});
