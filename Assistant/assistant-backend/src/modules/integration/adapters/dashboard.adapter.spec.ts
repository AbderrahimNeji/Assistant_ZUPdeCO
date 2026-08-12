import {
  DashboardAdapter,
  normalizeSeriesName,
  unwrapDashboardCharts,
} from './dashboard.adapter';

describe('dashboard establishment activity ranking', () => {
  const adapter = new DashboardAdapter({} as never);

  const charts = {
    sessionsByEstablishment: {
      categories: ['Lycée A', 'Collège B', 'École C'],
      series: [
        { name: 'Planifiées', data: [1, 8, 0] },
        { name: 'Terminées', data: [12, 3, 0] },
        { name: 'Clôturées', data: [2, 1, 0] },
      ],
    },
    resourcesByEstablishment: {
      categories: ['Lycée A', 'Collège B', 'École C'],
      series: [{ name: 'Élèves', data: [40, 90, 5] }],
    },
  };

  it('normalizes accented series names', () => {
    expect(normalizeSeriesName('Terminées')).toBe('terminees');
    expect(normalizeSeriesName('Élèves')).toBe('eleves');
  });

  it('unwraps nested data payloads', () => {
    expect(unwrapDashboardCharts({ data: charts })?.sessionsByEstablishment).toEqual(
      charts.sessionsByEstablishment,
    );
  });

  it('ranks most active by delivered sessions (completed + closed)', () => {
    const rank = adapter.rankEstablishmentActivity(charts);
    expect(rank?.primary.best.establishment).toBe('Lycée A');
    expect(rank?.primary.best.value).toBe(14);
    expect(rank?.why).toMatch(/session volume/i);
  });

  it('falls back to students when session series are empty', () => {
    const rank = adapter.rankEstablishmentActivity({
      resourcesByEstablishment: charts.resourcesByEstablishment,
    });
    expect(rank?.primary.best.establishment).toBe('Collège B');
    expect(rank?.primary.best.value).toBe(90);
  });
});
