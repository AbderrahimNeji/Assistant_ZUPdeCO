import { extractPersonName, apiPartialFacts } from './skill.utils';
import { softCall } from './skill-resilience';

describe('extractPersonName', () => {
  it('extracts Open Mohamed', () => {
    expect(extractPersonName('Open Mohamed')).toBe('Mohamed');
  });

  it('extracts Open the profile of Mohamed', () => {
    expect(extractPersonName('Open the profile of Mohamed')).toBe('Mohamed');
  });
});

describe('apiPartialFacts', () => {
  it('never maps timeout to document-not-found wording', () => {
    const facts = apiPartialFacts('GET /users/:id', new Error('timeout'));
    const blob = facts.join('\n');
    expect(blob).toMatch(/timeout/i);
    expect(blob).not.toMatch(/couldn['’]t find the information/i);
    expect(blob).not.toMatch(/GET\s+\//i);
    expect(blob).toMatch(/DIRECT ANSWER:/);
    expect(blob).toMatch(/SOURCE:/);
  });
});

describe('softCall', () => {
  it('retries once then succeeds', async () => {
    let n = 0;
    const result = await softCall('test', async () => {
      n += 1;
      if (n === 1) throw new Error('timeout');
      return 42;
    });
    expect(result.ok).toBe(true);
    expect(result.data).toBe(42);
    expect(result.retried).toBe(true);
  });

  it('returns partial warning instead of throwing', async () => {
    const result = await softCall(
      'test-fail',
      async () => {
        throw new Error('timeout');
      },
      { retries: 0, timeoutMs: 50 },
    );
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.warning).toMatch(/partial/i);
    expect(result.timedOut).toBe(true);
  });
});


describe('extractPersonName', () => {
  it('extracts Open Mohamed', () => {
    expect(extractPersonName('Open Mohamed')).toBe('Mohamed');
  });

  it('extracts Open the profile of Mohamed', () => {
    expect(extractPersonName('Open the profile of Mohamed')).toBe('Mohamed');
  });
});

describe('softCall', () => {
  it('retries once then succeeds', async () => {
    let n = 0;
    const result = await softCall('test', async () => {
      n += 1;
      if (n === 1) throw new Error('timeout');
      return 42;
    });
    expect(result.ok).toBe(true);
    expect(result.data).toBe(42);
    expect(result.retried).toBe(true);
  });

  it('returns partial warning instead of throwing', async () => {
    const result = await softCall(
      'test-fail',
      async () => {
        throw new Error('timeout');
      },
      { retries: 0, timeoutMs: 50 },
    );
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.warning).toMatch(/partial/i);
  });
});
