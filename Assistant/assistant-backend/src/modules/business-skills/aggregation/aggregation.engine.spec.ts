import {
  detectDimension,
  numericStats,
  parseAggregationIntent,
  rankBuckets,
  addToBucket,
} from './aggregation.engine';
import type { AggregationBucket } from './aggregation.engine';

describe('parseAggregationIntent', () => {
  it('detects students by establishment', () => {
    const intent = parseAggregationIntent('Students by establishment');
    expect(intent).not.toBeNull();
    expect(intent?.dimension).toBe('establishment');
    expect(intent?.ops).toContain('count');
  });

  it('detects French ranking formulations', () => {
    const intent = parseAggregationIntent(
      'Quels établissements sont les plus actifs ?',
    );
    expect(intent).not.toBeNull();
    expect(intent?.dimension).toBe('establishment');
    expect(intent?.ranking).toBe(true);
  });

  it('detects reports by tutor and by session', () => {
    expect(parseAggregationIntent('Reports by tutor')?.dimension).toBe('tutor');
    expect(parseAggregationIntent('Reports by session')?.dimension).toBe(
      'session',
    );
  });

  it('detects top N and statistics', () => {
    const top = parseAggregationIntent('Top 5 tutors');
    expect(top?.topN).toBe(5);
    expect(top?.dimension).toBe('tutor');
    expect(parseAggregationIntent('Attendance statistics')?.statistics).toBe(
      true,
    );
    expect(parseAggregationIntent('Matching statistics')?.statistics).toBe(
      true,
    );
  });

  it('ignores diagnostic and simple list questions', () => {
    expect(parseAggregationIntent('How many students?')).toBeNull();
    expect(parseAggregationIntent('Students without tutor')).toBeNull();
    expect(parseAggregationIntent("Why isn't this student matched?")).toBeNull();
    expect(parseAggregationIntent('Active students')).toBeNull();
  });
});

describe('aggregation compute', () => {
  it('computes COUNT SUM AVG MIN MAX', () => {
    const s = numericStats([2, 4, 6]);
    expect(s).toEqual({ count: 3, sum: 12, avg: 4, min: 2, max: 6 });
  });

  it('ranks grouped buckets', () => {
    const buckets = new Map<string, AggregationBucket>();
    addToBucket(buckets, 'a', 'A');
    addToBucket(buckets, 'a', 'A');
    addToBucket(buckets, 'b', 'B');
    const ranked = rankBuckets(buckets, 1);
    expect(ranked[0].key).toBe('a');
    expect(ranked[0].count).toBe(2);
  });

  it('detects dimensions', () => {
    expect(detectDimension('Sessions by establishment')).toBe('establishment');
    expect(detectDimension('Tutors by establishment')).toBe('establishment');
    expect(detectDimension('Top students')).toBe('student');
  });
});
