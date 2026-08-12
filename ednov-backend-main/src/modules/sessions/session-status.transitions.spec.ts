import { SessionStatus } from './entities/session.entity';
import {
  isAllowedStoredTransition,
  getEffectiveStatus,
  type SessionLike,
} from './session-status.transitions';

describe('session-status.transitions', () => {
  describe('isAllowedStoredTransition', () => {
    it('allows PLANNED → CANCELLED with trigger manual', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.PLANNED, SessionStatus.CANCELLED, 'manual'),
      ).toBe(true);
    });

    it('allows PLANNED → IN_PROGRESS with trigger attendance', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.PLANNED, SessionStatus.IN_PROGRESS, 'attendance'),
      ).toBe(true);
    });

    it('allows IN_PROGRESS → CLOSED with trigger cr_validation', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.IN_PROGRESS, SessionStatus.CLOSED, 'cr_validation'),
      ).toBe(true);
    });

    it('rejects PLANNED → CLOSED with trigger manual', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.PLANNED, SessionStatus.CLOSED, 'manual'),
      ).toBe(false);
    });

    it('rejects PLANNED → IN_PROGRESS with trigger manual', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.PLANNED, SessionStatus.IN_PROGRESS, 'manual'),
      ).toBe(false);
    });

    it('rejects IN_PROGRESS → CANCELLED with trigger manual', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.IN_PROGRESS, SessionStatus.CANCELLED, 'manual'),
      ).toBe(false);
    });

    it('rejects IN_PROGRESS → CLOSED with trigger attendance', () => {
      expect(
        isAllowedStoredTransition(SessionStatus.IN_PROGRESS, SessionStatus.CLOSED, 'attendance'),
      ).toBe(false);
    });

    it('rejects COMPLETED → CLOSED (COMPLETED is not stored, only IN_PROGRESS → CLOSED)', () => {
      expect(
        isAllowedStoredTransition(
          SessionStatus.COMPLETED as SessionStatus,
          SessionStatus.CLOSED,
          'cr_validation',
        ),
      ).toBe(false);
    });
  });

  describe('getEffectiveStatus', () => {
    const baseSession: SessionLike = {
      status: SessionStatus.PLANNED,
      sessionDate: '2025-06-15',
      startTime: '09:00:00',
      endTime: '10:30:00',
    };

    it('returns CLOSED unchanged', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.CLOSED };
      expect(getEffectiveStatus(session, new Date('2025-06-15T08:00:00Z'), 'UTC')).toBe(
        SessionStatus.CLOSED,
      );
    });

    it('returns CANCELLED unchanged', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.CANCELLED };
      expect(getEffectiveStatus(session, new Date('2025-06-15T11:00:00Z'), 'UTC')).toBe(
        SessionStatus.CANCELLED,
      );
    });

    it('returns COMPLETED unchanged when stored COMPLETED', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.COMPLETED };
      expect(getEffectiveStatus(session, new Date('2025-06-15T08:00:00Z'), 'UTC')).toBe(
        SessionStatus.COMPLETED,
      );
    });

    it('returns PLANNED when stored PLANNED and now before start', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.PLANNED };
      const now = new Date('2025-06-15T08:59:59Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.PLANNED);
    });

    it('returns IN_PROGRESS when stored PLANNED and now >= start', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.PLANNED };
      const now = new Date('2025-06-15T09:00:00Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.IN_PROGRESS);
    });

    it('returns IN_PROGRESS when stored PLANNED and now between start and end', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.PLANNED };
      const now = new Date('2025-06-15T10:00:00Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.IN_PROGRESS);
    });

    it('returns COMPLETED when stored PLANNED but session window has ended (still PLANNED in DB)', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.PLANNED };
      const now = new Date('2025-06-15T10:30:00Z');
      expect(getEffectiveStatus(session, now)).toBe(SessionStatus.COMPLETED);
    });

    it('handles 00:00:00–01:00:00 window: IN_PROGRESS during slot, COMPLETED after end (UTC wall clock)', () => {
      const session: SessionLike = {
        ...baseSession,
        sessionDate: '2026-03-24',
        startTime: '00:00:00',
        endTime: '01:00:00',
        status: SessionStatus.PLANNED,
      };
      expect(getEffectiveStatus(session, new Date('2026-03-24T00:30:00Z'), 'UTC')).toBe(
        SessionStatus.IN_PROGRESS,
      );
      expect(getEffectiveStatus(session, new Date('2026-03-24T01:00:00Z'), 'UTC')).toBe(
        SessionStatus.COMPLETED,
      );
    });

    it('uses default Europe/Paris for wall clock: same instant is IN_PROGRESS in Paris but PLANNED if interpreted as UTC', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.PLANNED };
      const now = new Date('2025-06-15T08:00:00Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.PLANNED);
      expect(getEffectiveStatus(session, now)).toBe(SessionStatus.IN_PROGRESS);
    });

    it('returns IN_PROGRESS when stored IN_PROGRESS and now before end', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.IN_PROGRESS };
      const now = new Date('2025-06-15T10:29:59Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.IN_PROGRESS);
    });

    it('returns COMPLETED when stored IN_PROGRESS and now >= end', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.IN_PROGRESS };
      const now = new Date('2025-06-15T10:30:00Z');
      expect(getEffectiveStatus(session, now)).toBe(SessionStatus.COMPLETED);
    });

    it('returns COMPLETED when stored IN_PROGRESS and now after end', () => {
      const session: SessionLike = { ...baseSession, status: SessionStatus.IN_PROGRESS };
      const now = new Date('2025-06-15T12:00:00Z');
      expect(getEffectiveStatus(session, now)).toBe(SessionStatus.COMPLETED);
    });

    it('accepts sessionDate as Date', () => {
      const session: SessionLike = {
        ...baseSession,
        sessionDate: new Date('2025-06-15T00:00:00Z'),
        status: SessionStatus.PLANNED,
      };
      const now = new Date('2025-06-15T09:00:00Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.IN_PROGRESS);
    });

    it('accepts startTime without seconds (HH:mm)', () => {
      const session: SessionLike = {
        ...baseSession,
        startTime: '09:00',
        endTime: '10:30',
        status: SessionStatus.PLANNED,
      };
      const now = new Date('2025-06-15T09:00:00Z');
      expect(getEffectiveStatus(session, now, 'UTC')).toBe(SessionStatus.IN_PROGRESS);
    });

    it('returns PLANNED when start time is missing', () => {
      const sessionNoStart: SessionLike = {
        ...baseSession,
        startTime: '',
        status: SessionStatus.PLANNED,
      };
      expect(getEffectiveStatus(sessionNoStart, new Date('2025-06-15T11:00:00Z'))).toBe(
        SessionStatus.PLANNED,
      );
    });

    it('returns IN_PROGRESS when PLANNED, end time missing, and now >= start', () => {
      const session: SessionLike = {
        ...baseSession,
        endTime: '',
        status: SessionStatus.PLANNED,
      };
      expect(getEffectiveStatus(session, new Date('2025-06-15T09:30:00Z'))).toBe(
        SessionStatus.IN_PROGRESS,
      );
    });

    it('returns IN_PROGRESS when stored IN_PROGRESS and end time is missing', () => {
      const sessionNoEnd: SessionLike = {
        ...baseSession,
        endTime: '',
        status: SessionStatus.IN_PROGRESS,
      };
      expect(getEffectiveStatus(sessionNoEnd, new Date('2025-06-15T11:00:00Z'))).toBe(
        SessionStatus.IN_PROGRESS,
      );
    });
  });
});
