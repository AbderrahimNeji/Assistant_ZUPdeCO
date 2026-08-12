jest.mock('@/services/sessions', () => ({
  checkStudentAvailability: jest.fn(),
}));

import {
  buildStudentSubmitBlockedMessage,
  formatConflictHint,
  isSessionSlotComplete,
  slotFromSession,
} from './sessionStudentAvailability';

describe('sessionStudentAvailability', () => {
  describe('slotFromSession', () => {
    it('extracts slot from mobile Session date + endTime', () => {
      expect(
        slotFromSession({ date: '2026-07-16T14:00:00', endTime: '15:30:00' }),
      ).toEqual({ sessionDate: '2026-07-16', startTime: '14:00:00', endTime: '15:30:00' });
    });

    it('returns null when endTime is missing', () => {
      expect(slotFromSession({ date: '2026-07-16T14:00:00', endTime: null })).toBeNull();
    });

    it('returns null when date has no time part', () => {
      expect(slotFromSession({ date: '2026-07-16', endTime: '15:30' })).toBeNull();
    });
  });

  describe('isSessionSlotComplete', () => {
    it('requires all three fields', () => {
      expect(
        isSessionSlotComplete({ sessionDate: '2026-07-16', startTime: '14:00', endTime: '15:00' }),
      ).toBe(true);
      expect(
        isSessionSlotComplete({ sessionDate: '', startTime: '14:00', endTime: '15:00' }),
      ).toBe(false);
      expect(isSessionSlotComplete(null)).toBe(false);
    });
  });

  describe('formatConflictHint', () => {
    it('formats start and end times', () => {
      expect(
        formatConflictHint({
          id: 's1',
          sessionDate: '2026-07-16',
          startTime: '14:00:00',
          endTime: '15:00:00',
        }),
      ).toBe('Déjà en séance de 14:00 à 15:00 ce jour-là.');
    });

    it('falls back without conflicting session', () => {
      expect(formatConflictHint(undefined)).toBe('Déjà en séance sur ce créneau horaire.');
    });
  });

  describe('buildStudentSubmitBlockedMessage', () => {
    it('singular vs plural', () => {
      expect(buildStudentSubmitBlockedMessage(['Ana B.'])).toContain("n'est pas disponible");
      expect(buildStudentSubmitBlockedMessage(['Ana B.', 'Karim L.'])).toContain(
        'ne sont pas disponibles',
      );
      expect(buildStudentSubmitBlockedMessage([])).toBe('');
    });
  });
});
