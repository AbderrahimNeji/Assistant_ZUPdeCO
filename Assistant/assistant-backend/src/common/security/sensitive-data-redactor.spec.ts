import { SensitiveDataRedactor } from './sensitive-data-redactor';

describe('SensitiveDataRedactor', () => {
  it('strips UUIDs but keeps human names', () => {
    const input =
      'Student Marie Dupont (id=a1b2c3d4-e5f6-4789-a012-3456789abcde) is enrolled.';
    const out = SensitiveDataRedactor.redact(input);
    expect(out).toContain('Marie Dupont');
    expect(out).not.toContain('a1b2c3d4-e5f6-4789-a012-3456789abcde');
    expect(out).toMatch(/REDACTED|Marie Dupont is enrolled/);
  });

  it('strips bare UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const out = SensitiveDataRedactor.redact(`Session ${uuid} starts at 10:00.`);
    expect(out).not.toContain(uuid);
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('starts at 10:00');
  });

  it('strips Mongo ObjectIds', () => {
    const oid = '507f1f77bcf86cd799439011';
    const out = SensitiveDataRedactor.redact(`doc ${oid}`);
    expect(out).not.toContain(oid);
    expect(out).toContain('[REDACTED]');
  });

  it('strips emails', () => {
    const out = SensitiveDataRedactor.redact(
      'Contact Marie Dupont <marie.dupont@school.fr> for help.',
    );
    expect(out).toContain('Marie Dupont');
    expect(out).not.toContain('marie.dupont@school.fr');
    expect(out).toContain('[REDACTED]');
  });

  it('strips id field assignments', () => {
    const out = SensitiveDataRedactor.redact(
      'Focused studentId=abc-def-123456 tutorId: xyz987654321',
    );
    expect(out).not.toContain('abc-def-123456');
    expect(out).not.toContain('xyz987654321');
    expect(out).toContain('studentId=[REDACTED]');
    expect(out).toContain('tutorId=[REDACTED]');
  });

  it('strips bearer tokens and JWTs', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
    const out = SensitiveDataRedactor.redact(
      `Authorization: Bearer ${jwt} password=supersecret`,
    );
    expect(out).not.toContain(jwt);
    expect(out).not.toContain('supersecret');
    expect(out).toContain('[REDACTED]');
  });

  it('strips connection strings', () => {
    const out = SensitiveDataRedactor.redact(
      'DB=postgresql://user:pass@localhost:5432/ednov',
    );
    expect(out).not.toContain('user:pass');
    expect(out).toContain('[REDACTED]');
  });

  it('keeps plain business labels without ids', () => {
    const input =
      '1. Marie Dupont — status=active\n2. Session Maths collège — status=planned';
    expect(SensitiveDataRedactor.redact(input)).toBe(input);
  });

  it('redactLines maps over arrays', () => {
    const lines = SensitiveDataRedactor.redactLines([
      'email alice@example.com',
      'ok name only',
    ]);
    expect(lines[0]).toContain('[REDACTED]');
    expect(lines[1]).toBe('ok name only');
  });
});
