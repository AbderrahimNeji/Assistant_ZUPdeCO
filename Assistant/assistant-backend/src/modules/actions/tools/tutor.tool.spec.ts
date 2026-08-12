import { isTutorLiveLookup } from './tutor.tool';

describe('isTutorLiveLookup', () => {
  it('treats Ask Copilot tutor prompts as live BI, not booking', () => {
    expect(
      isTutorLiveLookup(
        "Show this tutor’s workload, assigned students, and availability.",
      ),
    ).toBe(true);
    expect(isTutorLiveLookup('Show this tutor’s workload.')).toBe(true);
    expect(isTutorLiveLookup('Show this tutor’s availability.')).toBe(true);
  });

  it('does not steal booking intents', () => {
    expect(isTutorLiveLookup('Book a session with a tutor')).toBe(false);
  });
});
