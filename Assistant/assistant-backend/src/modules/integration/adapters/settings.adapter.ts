import { Injectable } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { TtlCache } from '../../../common/cache/ttl-cache';

type SettingsPayload = Record<string, unknown>;

/**
 * Safe read-only configuration / feature-flag access via user bearer.
 * Never writes settings from the Copilot.
 */
@Injectable()
export class SettingsAdapter {
  private readonly cache = new TtlCache<SettingsPayload>(30_000, 32);

  constructor(private readonly ednov: EdnovApiClient) {}

  async getSettings(): Promise<SettingsPayload> {
    const cached = this.cache.get('settings');
    if (cached) return cached;
    const data = await this.ednov.get<SettingsPayload>('/settings');
    this.cache.set('settings', data ?? {});
    return data ?? {};
  }

  async getFeatureFlags(): Promise<SettingsPayload> {
    const cached = this.cache.get('feature-flags');
    if (cached) return cached;
    const data = await this.ednov.get<SettingsPayload>('/settings/feature-flags');
    this.cache.set('feature-flags', data ?? {});
    return data ?? {};
  }

  /** Non-secret keys only — strip tokens / secrets before surfacing to skills. */
  sanitizeForFacts(payload: SettingsPayload): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const blocked = /(secret|token|password|key|credential|bearer|api[_-]?key)/i;
    for (const [key, value] of Object.entries(payload ?? {})) {
      if (blocked.test(key)) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        out[key] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        out[key] = this.sanitizeForFacts(value as SettingsPayload);
      } else if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
        out[key] = value.slice(0, 20);
      }
    }
    return out;
  }
}
