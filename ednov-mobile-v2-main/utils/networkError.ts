/**
 * Detect if an error is likely due to network/offline (no response, timeout, or network message).
 */
export function isNetworkError(error: unknown): boolean {
  if (error == null) return false;
  const err = error as { response?: { status?: number }; message?: string; name?: string; code?: string };
  const status = err?.response?.status;
  const message = (err?.message ?? err?.code ?? '').toString();
  if (status === 0 || err?.response == null) {
    if (err instanceof TypeError) return true;
    if (/Network Error|Failed to fetch|fetch failed|network request failed|timeout|ECONNABORTED|ERR_NETWORK/i.test(message)) return true;
  }
  return false;
}
