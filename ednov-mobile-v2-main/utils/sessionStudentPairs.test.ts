import {
  buildPairsForAddedStudents,
  mergeSessionPairs,
  derivePairsFromParticipants,
} from './sessionStudentPairs';

describe('sessionStudentPairs', () => {
  describe('buildPairsForAddedStudents', () => {
    it('assigns new students to the current tutor for classic sessions', () => {
      expect(
        buildPairsForAddedStudents({
          sessionType: 'individual_tutoring',
          newStudentIds: ['s1', 's2'],
          currentTutorId: 't1',
          facilitatorIds: ['t1', 't2'],
        }),
      ).toEqual([
        { studentUserId: 's1', tutorUserId: 't1' },
        { studentUserId: 's2', tutorUserId: 't1' },
      ]);
    });

    it('assigns new students to all facilitators for whole_class', () => {
      expect(
        buildPairsForAddedStudents({
          sessionType: 'whole_class',
          newStudentIds: ['s1'],
          currentTutorId: 't1',
          facilitatorIds: ['t1', 't2'],
        }),
      ).toEqual([
        { studentUserId: 's1', tutorUserId: 't1' },
        { studentUserId: 's1', tutorUserId: 't2' },
      ]);
    });
  });

  describe('mergeSessionPairs', () => {
    it('dedupes by student+tutor', () => {
      expect(
        mergeSessionPairs(
          [{ studentUserId: 's1', tutorUserId: 't1' }],
          [
            { studentUserId: 's1', tutorUserId: 't1' },
            { studentUserId: 's2', tutorUserId: 't1' },
          ],
        ),
      ).toEqual([
        { studentUserId: 's1', tutorUserId: 't1' },
        { studentUserId: 's2', tutorUserId: 't1' },
      ]);
    });
  });

  describe('derivePairsFromParticipants', () => {
    it('builds pairs for a single tutor', () => {
      expect(
        derivePairsFromParticipants([
          { userId: 't1', role: 'tutor' },
          { userId: 's1', role: 'student' },
        ]),
      ).toEqual([{ studentUserId: 's1', tutorUserId: 't1' }]);
    });

    it('uses all facilitators for whole_class', () => {
      expect(
        derivePairsFromParticipants(
          [
            { userId: 't1', role: 'tutor' },
            { userId: 't2', role: 'tutor' },
            { userId: 's1', role: 'student' },
          ],
          't1',
          'whole_class',
        ),
      ).toEqual([
        { studentUserId: 's1', tutorUserId: 't1' },
        { studentUserId: 's1', tutorUserId: 't2' },
      ]);
    });
  });
});