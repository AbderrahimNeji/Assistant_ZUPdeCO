import { DateTime } from 'luxon';
import type { Session } from './entities/session.entity';
import {
  dedupeRecurringSameCreatedStartSlot,
  floorSlot30,
  getSessionStartDateTime,
  isOnCreateInitialReportSlot,
  isRecurringSeriesForJob,
  isSameCreationCalendarDayAsSessionDate,
  isSessionAtOrAfter,
  isStartInWindow,
  sameSlot30,
  type SessionWithStart,
} from './session-report-job.utils';

describe('session-report-job.utils', () => {
  describe('isRecurringSeriesForJob', () => {
    it('returns true only for recurring mode with non-none non-once type', () => {
      expect(isRecurringSeriesForJob('recurring', 'weekly')).toBe(true);
      expect(isRecurringSeriesForJob('recurring', 'daily')).toBe(true);
      expect(isRecurringSeriesForJob('single', 'weekly')).toBe(false);
      expect(isRecurringSeriesForJob('recurring', 'once')).toBe(false);
      expect(isRecurringSeriesForJob('recurring', 'none')).toBe(false);
    });
  });

  describe('sameSlot30 / floorSlot30', () => {
    it('groups times within the same 30-minute civil slot', () => {
      const zone = 'Europe/Paris';
      const a = DateTime.fromObject({ year: 2026, month: 4, day: 17, hour: 10, minute: 5 }, { zone });
      const b = DateTime.fromObject({ year: 2026, month: 4, day: 17, hour: 10, minute: 29 }, { zone });
      expect(sameSlot30(a, b)).toBe(true);
      expect(floorSlot30(a).toFormat('HH:mm')).toBe('10:00');
      const c = DateTime.fromObject({ year: 2026, month: 4, day: 17, hour: 10, minute: 35 }, { zone });
      expect(sameSlot30(a, c)).toBe(false);
    });
  });

  describe('isSessionAtOrAfter', () => {
    it('is true when same date and time or later schedule', () => {
      const a = {
        sessionDate: new Date('2026-04-17'),
        startTime: '10:00',
      } as Session;
      const anchor = {
        sessionDate: new Date('2026-04-17'),
        startTime: '09:00',
      } as Session;
      const before = {
        sessionDate: new Date('2026-04-16'),
        startTime: '12:00',
      } as Session;
      expect(isSessionAtOrAfter(a, anchor)).toBe(true);
      expect(isSessionAtOrAfter(anchor, anchor)).toBe(true);
      expect(isSessionAtOrAfter(before, anchor)).toBe(false);
    });
  });

  describe('isSameCreationCalendarDayAsSessionDate', () => {
    it('is true when creation civil date matches session_date ymd', () => {
      const zone = 'Europe/Paris';
      const createdInZone = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 23, minute: 45 },
        { zone },
      );
      expect(isSameCreationCalendarDayAsSessionDate(createdInZone, '2026-04-17')).toBe(true);
      expect(isSameCreationCalendarDayAsSessionDate(createdInZone, '2026-04-18')).toBe(false);
    });
  });

  describe('isOnCreateInitialReportSlot', () => {
    it('is true when same civil slot30 but start outside rolling job window', () => {
      const zone = 'Europe/Paris';
      const createdInZone = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 10, minute: 35 },
        { zone },
      );
      const startDt = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 10, minute: 55 },
        { zone },
      );
      const windowStartUtc = DateTime.fromISO('2026-04-17T07:00:00.000Z', { zone: 'utc' });
      const windowEndUtc = windowStartUtc.plus({ minutes: 30 });
      expect(isOnCreateInitialReportSlot(createdInZone, startDt, windowStartUtc, windowEndUtc)).toBe(true);
    });

    it('is false when start falls inside rolling job window (defer to cron)', () => {
      const zone = 'Europe/Paris';
      const createdInZone = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 10, minute: 35 },
        { zone },
      );
      const startDt = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 10, minute: 45 },
        { zone },
      );
      const windowStartUtc = DateTime.fromISO('2026-04-17T08:30:00.000Z', { zone: 'utc' });
      const windowEndUtc = DateTime.fromISO('2026-04-17T09:00:00.000Z', { zone: 'utc' });
      expect(isOnCreateInitialReportSlot(createdInZone, startDt, windowStartUtc, windowEndUtc)).toBe(false);
    });
  });

  describe('isStartInWindow', () => {
    it('uses half-open interval [start, end) in UTC', () => {
      const zone = 'Europe/Paris';
      const startDt = getSessionStartDateTime('2026-04-17', '12:00:00', zone);
      const w0 = DateTime.fromISO('2026-04-17T10:01:00.000Z', { zone: 'utc' });
      const w1 = DateTime.fromISO('2026-04-17T11:00:00.000Z', { zone: 'utc' });
      expect(isStartInWindow(startDt, w0, w1)).toBe(false);
      const w0b = DateTime.fromISO('2026-04-17T09:50:00.000Z', { zone: 'utc' });
      const w1b = DateTime.fromISO('2026-04-17T10:10:00.000Z', { zone: 'utc' });
      expect(isStartInWindow(startDt, w0b, w1b)).toBe(true);
    });
  });

  describe('dedupeRecurringSameCreatedStartSlot', () => {
    const baseCompany = { timezone: 'Europe/Paris' } as Session['company'];

    function makeSession(partial: Partial<Session> & { id: string }): Session {
      return {
        companyId: 'c1',
        mode: 'recurring',
        recurrenceType: 'daily',
        recurrenceGroupId: 'g1',
        sessionDate: new Date('2026-04-17'),
        startTime: '10:00:00',
        company: baseCompany,
        ...partial,
      } as Session;
    }

    it('keeps earliest occurrence per group when recurring edge applies', () => {
      const zone = 'Europe/Paris';
      const createdJs = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 10, minute: 10 },
        { zone },
      ).toJSDate();
      const s1 = makeSession({
        id: 's1',
        sessionDate: new Date('2026-04-17'),
        startTime: '10:15:00',
        createdAt: createdJs,
      });
      const s2 = makeSession({
        id: 's2',
        sessionDate: new Date('2026-04-17'),
        startTime: '10:20:00',
        createdAt: createdJs,
      });
      const start1 = getSessionStartDateTime(s1.sessionDate, s1.startTime, zone);
      const start2 = getSessionStartDateTime(s2.sessionDate, s2.startTime, zone);
      const createdInZone = DateTime.fromJSDate(createdJs, { zone: 'utc' }).setZone(zone);
      const entries: SessionWithStart[] = [
        { session: s1, startDt: start1, createdInZone },
        { session: s2, startDt: start2, createdInZone },
      ];
      const out = dedupeRecurringSameCreatedStartSlot(entries);
      expect(out.map((s) => s.id)).toEqual(['s1']);
    });

    it('does not dedupe one-time sessions with same group edge (mode single)', () => {
      const zone = 'Europe/Paris';
      const createdJs = DateTime.fromObject(
        { year: 2026, month: 4, day: 17, hour: 10, minute: 10 },
        { zone },
      ).toJSDate();
      const s1 = makeSession({
        id: 'a',
        mode: 'single',
        recurrenceType: 'once',
        recurrenceGroupId: null,
        startTime: '10:10:00',
        createdAt: createdJs,
      });
      const s2 = makeSession({
        id: 'b',
        mode: 'single',
        recurrenceType: 'once',
        recurrenceGroupId: null,
        startTime: '10:25:00',
        createdAt: createdJs,
      });
      const cz = DateTime.fromJSDate(createdJs, { zone: 'utc' }).setZone(zone);
      const entries: SessionWithStart[] = [
        {
          session: s1,
          startDt: getSessionStartDateTime(s1.sessionDate, s1.startTime, zone),
          createdInZone: cz,
        },
        {
          session: s2,
          startDt: getSessionStartDateTime(s2.sessionDate, s2.startTime, zone),
          createdInZone: cz,
        },
      ];
      const out = dedupeRecurringSameCreatedStartSlot(entries);
      expect(out.map((s) => s.id).sort()).toEqual(['a', 'b']);
    });
  });
});
