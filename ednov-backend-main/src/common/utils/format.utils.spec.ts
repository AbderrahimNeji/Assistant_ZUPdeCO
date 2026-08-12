import { formatEducationCycleForExport, formatExportDate, formatProfileGenderForExport } from './format.utils';

describe('formatExportDate', () => {
  it('returns yyyy-mm-dd in UTC for a Date', () => {
    expect(formatExportDate(new Date('2024-06-15T12:00:00.000Z'))).toBe('2024-06-15');
  });

  it('accepts ISO date strings', () => {
    expect(formatExportDate('2025-01-03T08:30:00.000Z')).toBe('2025-01-03');
  });

  it('returns empty for nullish or invalid', () => {
    expect(formatExportDate(null)).toBe('');
    expect(formatExportDate(undefined)).toBe('');
    expect(formatExportDate('')).toBe('');
    expect(formatExportDate('not-a-date')).toBe('');
  });
});

describe('formatProfileGenderForExport', () => {
  it('maps codes and common variants to French labels', () => {
    expect(formatProfileGenderForExport('M')).toBe('Homme');
    expect(formatProfileGenderForExport('m')).toBe('Homme');
    expect(formatProfileGenderForExport('H')).toBe('Homme');
    expect(formatProfileGenderForExport('F')).toBe('Femme');
    expect(formatProfileGenderForExport('f')).toBe('Femme');
    expect(formatProfileGenderForExport('O')).toBe('Autre');
  });

  it('returns empty for unknown or blank', () => {
    expect(formatProfileGenderForExport('')).toBe('');
    expect(formatProfileGenderForExport(null)).toBe('');
    expect(formatProfileGenderForExport('unknown')).toBe('');
  });
});

describe('formatEducationCycleForExport', () => {
  it('maps API cycle codes to French labels', () => {
    expect(formatEducationCycleForExport('primary')).toBe('Primaire');
    expect(formatEducationCycleForExport('middle')).toBe('Collège');
    expect(formatEducationCycleForExport('high')).toBe('Lycée');
  });

  it('maps legacy spellings', () => {
    expect(formatEducationCycleForExport('primaire')).toBe('Primaire');
    expect(formatEducationCycleForExport('college')).toBe('Collège');
    expect(formatEducationCycleForExport('lycee')).toBe('Lycée');
  });

  it('returns empty for nullish', () => {
    expect(formatEducationCycleForExport(null)).toBe('');
    expect(formatEducationCycleForExport(undefined)).toBe('');
    expect(formatEducationCycleForExport('')).toBe('');
  });
});
