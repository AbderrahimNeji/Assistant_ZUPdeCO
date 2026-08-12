/**
 * Aligns with Nest `app.setGlobalPrefix('api/v1')` when env is only the origin.
 */
export function getApiV1BaseUrlFromEnv(apiUrl: string | undefined): string {
  const raw = (apiUrl ?? '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (/\/api\/v\d+$/i.test(raw)) {
    return raw;
  }
  if (/\/api$/i.test(raw)) {
    return `${raw}/v1`;
  }
  if (!raw.includes('/api/')) {
    return `${raw}/api/v1`;
  }
  return raw;
}
