import { resolveLevelBadge } from './level-badge.util';

describe('resolveLevelBadge', () => {
  it('returns Bronze meta for numero 1', () => {
    expect(resolveLevelBadge(1)).toEqual({
      code: 'LEVEL_TIER_BRONZE',
      tier: 'bronze',
      displayLabel: 'Bronze',
      theme: 'bronze',
      niveauNumero: 1,
    });
  });

  it('returns Argent meta for numero 2', () => {
    expect(resolveLevelBadge(2)).toMatchObject({
      code: 'LEVEL_TIER_SILVER',
      tier: 'silver',
      displayLabel: 'Argent',
      niveauNumero: 2,
    });
  });

  it('returns Gold meta for numero 3', () => {
    expect(resolveLevelBadge(3)).toMatchObject({
      code: 'LEVEL_TIER_GOLD',
      tier: 'gold',
      displayLabel: 'Gold',
      niveauNumero: 3,
    });
  });

  it('returns null for numero > 3', () => {
    expect(resolveLevelBadge(4)).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(resolveLevelBadge(null)).toBeNull();
    expect(resolveLevelBadge(undefined)).toBeNull();
  });

  it('truncates float numeros', () => {
    expect(resolveLevelBadge(2.9)?.niveauNumero).toBe(2);
  });
});
