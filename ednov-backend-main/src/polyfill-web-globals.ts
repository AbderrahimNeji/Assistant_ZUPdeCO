/**
 * google-auth-library (used by firebase-admin) expects Web fetch APIs.
 * If `Headers` is missing, token refresh fails with "Headers is not defined".
 * Load this module before any Firebase Admin usage.
 * Node 20+ has global `fetch`; do not assign undici's fetch (Request types conflict with TS lib.dom).
 */
import { Headers as UndiciHeaders } from 'undici';

if (typeof globalThis.Headers === 'undefined') {
  // Undici vs lib.dom Headers differ in TS (iterators, dispose); at runtime this is the polyfill we need.
  (globalThis as unknown as Record<string, typeof UndiciHeaders>).Headers = UndiciHeaders;
}
