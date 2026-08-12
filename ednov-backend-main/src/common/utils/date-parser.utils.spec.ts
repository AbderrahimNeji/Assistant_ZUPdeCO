import {
  computeRemainingCalendarMonthsUntilDate,
  parseLocalDate,
  parseLocalDateEndOfDay,
} from './date-parser.utils';

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseLocalDate('2026-04-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(1);
  });
});

describe('parseLocalDateEndOfDay', () => {
  it('sets end of local day', () => {
    const d = parseLocalDateEndOfDay('2026-04-30');
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });
});

describe('computeRemainingCalendarMonthsUntilDate', () => {
  /** Local 28 Apr 2026 */
  const ref = new Date(2026, 3, 28);

  it('returns 0 when end date raw value is missing', () => {
    expect(computeRemainingCalendarMonthsUntilDate(undefined, ref)).toBe(0);
    expect(computeRemainingCalendarMonthsUntilDate(null, ref)).toBe(0);
  });

  it('returns 0 for invalid Date values', () => {
    expect(computeRemainingCalendarMonthsUntilDate(new Date(Number.NaN), ref)).toBe(0);
    expect(computeRemainingCalendarMonthsUntilDate(new Date('not-a-date'), ref)).toBe(0);
  });

  it('returns 0 when string does not match YYYY-MM-DD prefix', () => {
    expect(computeRemainingCalendarMonthsUntilDate('', ref)).toBe(0);
    expect(computeRemainingCalendarMonthsUntilDate('bogus', ref)).toBe(0);
  });

  it('returns 0 when end date is same as or before reference', () => {
    expect(computeRemainingCalendarMonthsUntilDate('2026-04-27', ref)).toBe(0);
    expect(computeRemainingCalendarMonthsUntilDate('2026-04-28', ref)).toBe(0);
    expect(computeRemainingCalendarMonthsUntilDate(ref, ref)).toBe(0);
  });

  it('subtracts one month chunk when end DOM is before reference DOM', () => {
    expect(computeRemainingCalendarMonthsUntilDate('2027-06-01', ref)).toBe(13);
    expect(computeRemainingCalendarMonthsUntilDate('2026-05-01', ref)).toBe(0);
    expect(computeRemainingCalendarMonthsUntilDate('2026-06-01', ref)).toBe(1);
  });

  it('keeps full month count when end DOM ≥ reference DOM', () => {
    expect(computeRemainingCalendarMonthsUntilDate('2027-06-28', ref)).toBe(14);
    expect(computeRemainingCalendarMonthsUntilDate(new Date(2027, 5, 30), ref)).toBe(14);
  });

  it('uses local parts for Date instances (parity with DATE columns)', () => {
    expect(computeRemainingCalendarMonthsUntilDate(new Date(2030, 0, 15), ref)).toBe(44);
  });
});
