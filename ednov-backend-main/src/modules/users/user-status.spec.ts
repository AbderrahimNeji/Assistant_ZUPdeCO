import {
  formatStudentAccountStatusLabelFr,
  isStudentAccountStatus,
} from './user-status';

describe('formatStudentAccountStatusLabelFr', () => {
  it('maps known student statuses to French labels', () => {
    expect(formatStudentAccountStatusLabelFr('registered')).toBe('Inscrit');
    expect(formatStudentAccountStatusLabelFr('accompanied')).toBe('Accompagné');
    expect(formatStudentAccountStatusLabelFr('deactivated')).toBe('Désactivé');
  });

  it('returns unknown strings unchanged', () => {
    expect(formatStudentAccountStatusLabelFr('active')).toBe('active');
    expect(formatStudentAccountStatusLabelFr('')).toBe('');
    expect(formatStudentAccountStatusLabelFr('legacy')).toBe('legacy');
  });
});

describe('isStudentAccountStatus', () => {
  it('narrows student codes', () => {
    expect(isStudentAccountStatus('registered')).toBe(true);
    expect(isStudentAccountStatus('active')).toBe(false);
  });
});
