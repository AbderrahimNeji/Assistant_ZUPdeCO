import { Injectable } from '@nestjs/common';

import { SensitiveDataRedactor } from '../../../common/security/sensitive-data-redactor';
import {
  BusinessIntelligencePlan,
  BusinessTransparency,
  BusinessVisual,
  BusinessVisualKpi,
  BusinessVisualTable,
  SkillResult,
} from '../skill.types';

export type MergeOutput = {
  mergedFacts: string[];
  transparency: BusinessTransparency;
  businessVisual?: BusinessVisual;
};

/**
 * Merges skill results into grounded LLM context + transparency + visuals.
 * Never invents numbers — unavailable data is stated explicitly.
 */
@Injectable()
export class ResultMerger {
  merge(
    plan: BusinessIntelligencePlan,
    results: SkillResult[],
    options?: {
      classificationConfidence?: number;
      cacheHit?: boolean;
    },
  ): MergeOutput {
    const succeeded = results.filter((r) => r.ok).map((r) => r.skillId);
    const failed = results.filter((r) => !r.ok).map((r) => r.skillId);
    const partial = failed.length > 0 && succeeded.length > 0;
    const allFailed = results.length > 0 && succeeded.length === 0;

    const confidence = this.computeConfidence(
      options?.classificationConfidence ?? 0.7,
      results,
      options?.cacheHit,
    );

    const modulesQueried = [
      ...new Set([...(plan.domains ?? []), ...plan.skillIds]),
    ];

    const transparency: BusinessTransparency = {
      dataSource: 'ednov_live',
      questionCategory: plan.questionType,
      skillsExecuted: plan.skillIds,
      skillsSucceeded: succeeded,
      skillsFailed: failed,
      modulesQueried,
      confidence,
      freshness: new Date().toISOString(),
      partial: partial || allFailed,
      cacheHit: options?.cacheHit,
      rationale: plan.rationale,
    };

    const lines: string[] = [
      '=== LIVE BUSINESS DATA (from Ednov services via Business Query Engine) ===',
      `Question category: ${plan.questionType}`,
      `Skills executed: ${plan.skillIds.join(', ') || '(none)'}`,
      `Skills succeeded: ${succeeded.join(', ') || '(none)'}`,
      failed.length
        ? `Skills failed (partial response): ${failed.join(', ')}`
        : 'Skills failed: (none)',
      `Data source: ${transparency.dataSource}`,
      `Freshness: ${transparency.freshness}`,
      `Confidence: ${transparency.confidence.toFixed(2)}`,
      'Instructions for the model: answer ONLY with these facts. Do not invent counts, names, or statuses.',
      'If a fact is missing or a skill failed, say the live data is unavailable — never guess.',
      'If confidence is low or facts are partial, say the answer could not be fully verified from live data.',
      'Refer to people and entities by human labels (name, title, date, status) — never by UUID or internal id.',
      'Never emit raw JSON or internal ids; never use LaTeX/KaTeX/MathJax — write numbers in plain Unicode (e.g. √117 cm, x², a/b).',
      'When facts include Markdown tables or KPI blocks, preserve them in the answer for visual scanning.',
      'Explain live issues with coordinator structure when relevant: Current situation → Required / satisfied conditions → Missing conditions → Relevant business rule (from docs if present) → Suggested resolution.',
      'Always include: direct answer, brief explanation, business reasoning, next recommended action (if useful), and sources (live module / doc pages from CONTEXT — never invent).',
      '',
    ];

    if (allFailed) {
      lines.push(
        'No live business facts could be retrieved. Tell the user the data is currently unavailable.',
        '',
      );
    }

    for (const result of results) {
      lines.push(
        `--- Skill: ${result.skillId} / ${result.operation} (ok=${result.ok}${
          typeof result.durationMs === 'number'
            ? `, ${result.durationMs}ms`
            : ''
        }) ---`,
      );
      if (result.facts.length) {
        lines.push(...SensitiveDataRedactor.redactLines(result.facts));
      } else if (!result.ok) {
        lines.push('(no facts — skill unavailable)');
      } else {
        lines.push('(no facts)');
      }
      if (result.warnings?.length) {
        lines.push(
          ...SensitiveDataRedactor.redactLines(
            result.warnings.map((w) => `Warning: ${w}`),
          ),
        );
      }
      lines.push('');
    }

    const businessVisual = this.buildVisual(results);

    return {
      mergedFacts: SensitiveDataRedactor.redactLines(lines),
      transparency,
      businessVisual,
    };
  }

  private computeConfidence(
    base: number,
    results: SkillResult[],
    cacheHit?: boolean,
  ): number {
    if (!results.length) return Math.min(base, 0.3);
    const okRatio = results.filter((r) => r.ok).length / results.length;
    let score = base * (0.45 + 0.55 * okRatio);
    if (cacheHit) score = Math.min(score, score * 0.98);
    return Math.round(Math.max(0.05, Math.min(0.99, score)) * 100) / 100;
  }

  private buildVisual(results: SkillResult[]): BusinessVisual | undefined {
    const kpis: BusinessVisualKpi[] = [];
    const tables: BusinessVisualTable[] = [];

    for (const result of results) {
      if (!result.ok) continue;

      const fromFacts = this.tablesFromMarkdownFacts(
        result.facts,
        result.skillId,
      );
      tables.push(...fromFacts);

      const data = result.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const entries = Object.entries(data as Record<string, unknown>).filter(
          ([, v]) => typeof v === 'number',
        );
        for (const [key, value] of entries.slice(0, 12)) {
          kpis.push({ label: key, value: value as number });
        }

        const nestedStats = (data as { stats?: Record<string, unknown> }).stats;
        if (nestedStats && typeof nestedStats === 'object') {
          for (const [key, value] of Object.entries(nestedStats)) {
            if (typeof value === 'number') {
              kpis.push({ label: key, value });
            }
          }
        }
      }
    }

    const uniqueKpis = this.dedupeKpis(kpis).slice(0, 16);
    if (!uniqueKpis.length && !tables.length) return undefined;

    const kind =
      uniqueKpis.length && tables.length
        ? 'mixed'
        : uniqueKpis.length
          ? 'kpis'
          : 'table';

    return {
      kind,
      title: 'Live business snapshot',
      kpis: uniqueKpis.length ? uniqueKpis : undefined,
      tables: tables.length ? tables.slice(0, 4) : undefined,
    };
  }

  private tablesFromMarkdownFacts(
    facts: string[],
    skillId: string,
  ): BusinessVisualTable[] {
    const tables: BusinessVisualTable[] = [];
    let headers: string[] | null = null;
    let rows: Array<Array<string | number>> = [];
    let title: string | undefined;

    const flush = () => {
      if (headers && rows.length) {
        tables.push({ title: title ?? skillId, headers, rows });
      }
      headers = null;
      rows = [];
      title = undefined;
    };

    for (const line of facts) {
      const heading = /^###\s+(.+)$/.exec(line);
      if (heading) {
        flush();
        title = heading[1].trim();
        continue;
      }
      if (!line.includes('|')) continue;
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (!cells.length) continue;
      if (/^[-:]+$/.test(cells.join('').replace(/\s/g, ''))) continue;
      if (!headers) {
        headers = cells;
      } else {
        rows.push(cells);
      }
    }
    flush();
    return tables;
  }

  private dedupeKpis(kpis: BusinessVisualKpi[]): BusinessVisualKpi[] {
    const seen = new Set<string>();
    const out: BusinessVisualKpi[] = [];
    for (const kpi of kpis) {
      const key = kpi.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(kpi);
    }
    return out;
  }
}
