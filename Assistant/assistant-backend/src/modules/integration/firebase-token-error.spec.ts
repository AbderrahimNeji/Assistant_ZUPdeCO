import { classifyFirebaseTokenError } from './firebase-token-error';

describe('classifyFirebaseTokenError', () => {
  it('treats revoked and disabled users as revoked', () => {
    expect(
      classifyFirebaseTokenError({ code: 'auth/id-token-revoked' }),
    ).toBe('revoked');
    expect(
      classifyFirebaseTokenError({ code: 'auth/user-disabled' }),
    ).toBe('revoked');
  });

  it('treats expired and malformed tokens as invalid', () => {
    expect(
      classifyFirebaseTokenError({ code: 'auth/id-token-expired' }),
    ).toBe('invalid');
    expect(
      classifyFirebaseTokenError({ code: 'auth/invalid-id-token' }),
    ).toBe('invalid');
    expect(
      classifyFirebaseTokenError(new Error('Decoding Firebase ID token failed')),
    ).toBe('invalid');
  });

  it('treats IAM and network failures as infrastructure', () => {
    expect(
      classifyFirebaseTokenError({ code: 'auth/insufficient-permission' }),
    ).toBe('infra');
    expect(
      classifyFirebaseTokenError({ code: 'auth/internal-error' }),
    ).toBe('infra');
    expect(
      classifyFirebaseTokenError(new Error('getaddrinfo ENOTFOUND identitytoolkit.googleapis.com')),
    ).toBe('infra');
  });
});
