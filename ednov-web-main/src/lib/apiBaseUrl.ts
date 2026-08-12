/**
 * Resolves the REST/SSE base URL to match Nest's `app.setGlobalPrefix('api/v1')`.
 * If `VITE_API_URL` is only the origin (e.g. http://localhost:3000), we append /api/v1
 * so EventSource and axios use the same paths as `/notifications`, `/sessions/...`, etc.
 */
export function getApiV1BaseUrlFromEnv(viteUrl: string | undefined): string {
  const raw = (viteUrl ?? '').trim().replace(/\/$/, '');
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
