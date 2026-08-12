import { Injectable } from '@nestjs/common';

import { SettingsAdapter } from '../../integration/adapters/settings.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, safeErrorMessage } from '../skill.utils';

/**
 * Safe read-only configuration / feature flags.
 * Never mutates Ednov settings from the Copilot.
 */
@Injectable()
export class ConfigurationSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'configuration';
  readonly domains = [
    /\b(company|companies|entreprise|entreprises|configuration|config|settings|paramètres|parametres|préférences|preferences|feature.?flag|flags)\b/i,
  ];
  readonly domainTags = ['configuration', 'settings'];
  readonly capabilities: SkillCapability[] = ['status', 'list'];

  constructor(
    private readonly settings: SettingsAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: [
            'Company configuration requires staff authorization.',
            'Authenticated users may adjust personal preferences in Ednov UI only.',
          ],
        };
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const [rawSettings, rawFlags] = await Promise.all([
        this.settings.getSettings().catch(() => ({})),
        this.settings.getFeatureFlags().catch(() => ({})),
      ]);

      const settings = this.settings.sanitizeForFacts(rawSettings);
      const flags = this.settings.sanitizeForFacts(rawFlags);

      const settingLines = Object.entries(settings)
        .slice(0, 20)
        .map(([k, v]) => `| ${k} | ${stringifyCell(v)} |`);
      const flagLines = Object.entries(flags)
        .slice(0, 20)
        .map(([k, v]) => `| ${k} | ${stringifyCell(v)} |`);

      return {
        skillId: this.id,
        ok: true,
        operation: 'read_configuration',
        data: { settings, flags },
        facts: [
          'Company configuration (safe read, secrets stripped, authorization-scoped):',
          '',
          '### Settings',
          '| Key | Value |',
          '| --- | --- |',
          ...(settingLines.length ? settingLines : ['| (none) | — |']),
          '',
          '### Feature flags',
          '| Flag | Value |',
          '| --- | --- |',
          ...(flagLines.length ? flagLines : ['| (none) | — |']),
          '',
          'Copilot cannot change configuration — use Ednov Settings UI for writes.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts(this.id, error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }
}

function stringifyCell(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, 80);
    } catch {
      return '[object]';
    }
  }
  return String(value).slice(0, 80);
}
