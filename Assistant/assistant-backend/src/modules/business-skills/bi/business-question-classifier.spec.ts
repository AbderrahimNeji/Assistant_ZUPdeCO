import { BusinessQuestionClassifier } from './business-question-classifier';

describe('BusinessQuestionClassifier', () => {
  const classifier = new BusinessQuestionClassifier();

  it('classifies COUNT questions', () => {
    expect(
      classifier.classify('How many students are enrolled?').category,
    ).toBe('COUNT');
    expect(classifier.classify('Combien de tuteurs ?').category).toBe('COUNT');
  });

  it('classifies SEARCH questions', () => {
    expect(classifier.classify('Find student Jean Dupont').category).toBe(
      'SEARCH',
    );
    expect(classifier.classify('Qui est Marie Curie ?').category).toBe(
      'SEARCH',
    );
  });

  it('classifies STATUS questions', () => {
    expect(classifier.classify('Has Jean submitted the report?').category).toBe(
      'STATUS',
    );
  });

  it('classifies LIST questions', () => {
    expect(classifier.classify('List students without a tutor').category).toBe(
      'LIST',
    );
  });

  it('classifies STATISTICS questions', () => {
    expect(
      classifier.classify('What is the average attendance rate?').category,
    ).toBe('STATISTICS');
  });

  it('classifies COMPARISON questions', () => {
    expect(
      classifier.classify('Which establishment has the most students?')
        .category,
    ).toBe('COMPARISON');
  });

  it('classifies HYBRID when docs + live signals co-occur', () => {
    const result = classifier.classify(
      'How does matching work and show me students without a tutor',
    );
    expect(result.category).toBe('HYBRID');
    expect(result.hybridSignals).toBe(true);
  });

  it('returns UNKNOWN for empty or vague questions', () => {
    expect(classifier.classify('').category).toBe('UNKNOWN');
    expect(classifier.classify('hello there').category).toBe('UNKNOWN');
  });

  it('exposes requested capabilities for COUNT', () => {
    expect(
      classifier.classify('How many programs?').requestedCapabilities,
    ).toEqual(['count']);
  });
});
