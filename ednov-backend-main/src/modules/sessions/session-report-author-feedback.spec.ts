import {
  assertAuthorFeedbacksShape,
  buildAuthorFeedbackSkeleton,
  getNonStudentAuthorIds,
  isActorFeedbackComplete,
  isPrivilegedSessionReportEditor,
  mergeAuthorFeedbackUpdate,
} from './session-report-author-feedback';
import type { Session } from './entities/session.entity';
import type { SessionParticipant } from './entities/session-participant.entity';

describe('session-report-author-feedback', () => {
  const wholeClassSession = {
    type: 'whole_class',
    managedById: 'mgr-1',
    createdById: 'crt-1',
  } as Pick<Session, 'type' | 'managedById' | 'createdById'>;

  const tutoringSession = {
    type: 'individual_tutoring',
    managedById: 'mgr-1',
    createdById: 'crt-1',
  } as Pick<Session, 'type' | 'managedById' | 'createdById'>;

  const participants: Pick<SessionParticipant, 'userId' | 'role'>[] = [
    { userId: 'tutor-b', role: 'tutor' },
    { userId: 'tutor-a', role: 'tutor' },
    { userId: 'vol-1', role: 'volunteer' },
    { userId: 'stu-1', role: 'student' },
  ];

  it('whole_class returns non-student ids ordered tutor then volunteer then userId', () => {
    const ids = getNonStudentAuthorIds(wholeClassSession, participants, 'author-1');
    expect(ids).toEqual(['tutor-a', 'tutor-b', 'vol-1']);
  });

  it('non-whole_class returns first non-student when present', () => {
    const ids = getNonStudentAuthorIds(tutoringSession, participants, 'author-1');
    expect(ids).toEqual(['tutor-a']);
  });

  it('non-whole_class falls back to report author when no non-student', () => {
    const ids = getNonStudentAuthorIds(
      tutoringSession,
      [{ userId: 'stu-1', role: 'student' }],
      'author-1',
    );
    expect(ids).toEqual(['author-1']);
  });

  it('isActorFeedbackComplete checks only actor entry and subjects', () => {
    const complete = isActorFeedbackComplete(
      {
        subjectIds: ['sub-1'],
        authorFeedbacks: [
          { idAuteur: 'tutor-a', rating: 5, comment: 'ok', feeling: null },
          { idAuteur: 'tutor-b', rating: null, comment: null, feeling: null },
        ],
      },
      'tutor-a',
    );
    expect(complete).toBe(true);

    const incompletePeer = isActorFeedbackComplete(
      {
        subjectIds: ['sub-1'],
        authorFeedbacks: [
          { idAuteur: 'tutor-a', rating: null, comment: null, feeling: null },
          { idAuteur: 'tutor-b', rating: 5, comment: 'done', feeling: null },
        ],
      },
      'tutor-a',
    );
    expect(incompletePeer).toBe(false);
  });

  it('mergeAuthorFeedbackUpdate rejects foreign idAuteur for non-privileged user', () => {
    const existing = buildAuthorFeedbackSkeleton(['tutor-a', 'tutor-b']);
    expect(() =>
      mergeAuthorFeedbackUpdate(
        existing,
        [{ idAuteur: 'tutor-b', rating: 4, comment: null, feeling: null }],
        'tutor-a',
        false,
      ),
    ).toThrow('You can only update your own session report feedback');
  });

  it('mergeAuthorFeedbackUpdate allows VSC to patch another author slot', () => {
    const existing = buildAuthorFeedbackSkeleton(['tutor-a', 'tutor-b']);
    const merged = mergeAuthorFeedbackUpdate(
      existing,
      [{ idAuteur: 'tutor-b', rating: 4, comment: 'filled by vsc', feeling: null }],
      'vsc-1',
      isPrivilegedSessionReportEditor(['VSC']),
    );
    expect(merged.find((e) => e.idAuteur === 'tutor-b')?.rating).toBe(4);
    expect(merged.find((e) => e.idAuteur === 'tutor-b')?.comment).toBe('filled by vsc');
  });

  it('isPrivilegedSessionReportEditor includes VSC and volunteer (compte VSC)', () => {
    expect(isPrivilegedSessionReportEditor(['vsc'])).toBe(true);
    expect(isPrivilegedSessionReportEditor(['volunteer'])).toBe(true);
    expect(isPrivilegedSessionReportEditor(['TUTOR'])).toBe(false);
  });

  it('mergeAuthorFeedbackUpdate allows volunteer (VSC) to patch another author slot', () => {
    const existing = buildAuthorFeedbackSkeleton(['tutor-a', 'tutor-b']);
    const merged = mergeAuthorFeedbackUpdate(
      existing,
      [{ idAuteur: 'tutor-b', rating: 3, comment: 'ok', feeling: null }],
      'vsc-user-1',
      isPrivilegedSessionReportEditor(['volunteer']),
    );
    expect(merged.find((e) => e.idAuteur === 'tutor-b')?.rating).toBe(3);
  });

  it('assertAuthorFeedbacksShape rejects wrong length', () => {
    expect(() =>
      assertAuthorFeedbacksShape(['a', 'b'], [{ idAuteur: 'a', rating: null, comment: null, feeling: null }]),
    ).toThrow('exactly 2 entries');
  });
});
