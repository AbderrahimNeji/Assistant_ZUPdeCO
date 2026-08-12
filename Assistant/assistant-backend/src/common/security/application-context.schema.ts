import { BadRequestException } from '@nestjs/common';

import type { ApplicationContext, EntityRef } from '../../modules/integration/request-context';
import { sanitizeUntrusted, UNTRUSTED_MAX } from './untrusted-text';

const MAX_JSON_BYTES = 16_384;
const MAX_DEPTH = 4;
const MAX_STRING = 500;
const MAX_FILTER_KEYS = 30;
const MAX_ENTITIES = 20;

const ROOT_KEYS = new Set([
  'page',
  'selection',
  'filters',
  'search',
  'date',
  'program',
  'session',
  'student',
  'tutor',
  'document',
  'course',
  'benchmark',
  'establishment',
  'matching',
  'report',
  'parent',
  'user',
  'company',
  'locale',
  'focus',
]);

const PAGE_KEYS = new Set(['route', 'interfaceId', 'title']);
const ENTITY_KEYS = new Set(['type', 'id', 'label', 'company', 'role', 'page']);
const DATE_KEYS = new Set(['start', 'end', 'label']);
const FOCUS_KEYS = new Set(['pinned', 'source', 'scope']);
const FOCUS_SOURCES = new Set(['page', 'manual']);
const FOCUS_SCOPES = new Set(['entity', 'comparison', 'global']);

function depthOf(value: unknown, depth = 0): number {
  if (depth > MAX_DEPTH) return depth;
  if (!value || typeof value !== 'object') return depth;
  let max = depth;
  const children = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const next = depthOf(child, depth + 1);
    if (next > max) max = next;
  }
  return max;
}

function asTrimmedString(value: unknown, max = MAX_STRING): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = sanitizeUntrusted(value, max).trim();
  return text || undefined;
}

function parseEntity(raw: unknown): EntityRef | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    if (!ENTITY_KEYS.has(key)) {
      throw new BadRequestException('Malformed application context');
    }
  }
  const id = asTrimmedString(row.id, 128);
  const type = asTrimmedString(row.type, 64);
  if (!id || !type) return undefined;
  return {
    type,
    id,
    label: asTrimmedString(row.label, UNTRUSTED_MAX.label),
    company: asTrimmedString(row.company, UNTRUSTED_MAX.label),
    role: asTrimmedString(row.role, 64),
    page: asTrimmedString(row.page, UNTRUSTED_MAX.title),
  };
}

function parseFilters(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, MAX_FILTER_KEYS);
  const out: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    const safeKey = asTrimmedString(key, 64);
    if (!safeKey) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[safeKey] =
        typeof value === 'string' ? sanitizeUntrusted(value, UNTRUSTED_MAX.label) : value;
    } else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      out[safeKey] = value
        .slice(0, 20)
        .map((item) => sanitizeUntrusted(item, UNTRUSTED_MAX.label));
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Strict allowlisted ApplicationContext. Rejects oversized / deep / unknown shapes.
 * Does not authorize — adapters still re-fetch with the caller bearer.
 */
export function parseApplicationContext(
  raw: Record<string, unknown> | undefined,
): ApplicationContext | null {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Malformed application context');
  }

  const serialized = JSON.stringify(raw);
  if (serialized.length > MAX_JSON_BYTES) {
    throw new BadRequestException('Application context is too large');
  }
  if (depthOf(raw) > MAX_DEPTH) {
    throw new BadRequestException('Application context is too deeply nested');
  }

  for (const key of Object.keys(raw)) {
    if (!ROOT_KEYS.has(key)) {
      throw new BadRequestException('Malformed application context');
    }
  }

  const ctx: ApplicationContext = {};

  if (raw.page && typeof raw.page === 'object' && !Array.isArray(raw.page)) {
    const page = raw.page as Record<string, unknown>;
    for (const key of Object.keys(page)) {
      if (!PAGE_KEYS.has(key)) {
        throw new BadRequestException('Malformed application context');
      }
    }
    ctx.page = {
      route: asTrimmedString(page.route, 200),
      interfaceId: asTrimmedString(page.interfaceId, 80),
      title: asTrimmedString(page.title, UNTRUSTED_MAX.title),
    };
  }

  if (raw.selection && typeof raw.selection === 'object' && !Array.isArray(raw.selection)) {
    const selection = raw.selection as Record<string, unknown>;
    const entities = Array.isArray(selection.entities)
      ? selection.entities
          .slice(0, MAX_ENTITIES)
          .map(parseEntity)
          .filter((item): item is EntityRef => Boolean(item))
      : undefined;
    ctx.selection = {
      primary: parseEntity(selection.primary),
      entities,
    };
  }

  const filters = parseFilters(raw.filters);
  if (filters) ctx.filters = filters;

  const search = asTrimmedString(raw.search, UNTRUSTED_MAX.label);
  if (search) ctx.search = search;

  if (raw.date && typeof raw.date === 'object' && !Array.isArray(raw.date)) {
    const date = raw.date as Record<string, unknown>;
    for (const key of Object.keys(date)) {
      if (!DATE_KEYS.has(key)) {
        throw new BadRequestException('Malformed application context');
      }
    }
    ctx.date = {
      start: asTrimmedString(date.start, 32),
      end: asTrimmedString(date.end, 32),
      label: asTrimmedString(date.label, UNTRUSTED_MAX.label),
    };
  }

  for (const key of [
    'program',
    'session',
    'student',
    'tutor',
    'document',
    'course',
    'benchmark',
    'establishment',
    'matching',
    'report',
    'parent',
    'user',
    'company',
  ] as const) {
    const parsed = parseEntity(raw[key]);
    if (parsed) ctx[key] = parsed;
  }

  const locale = asTrimmedString(raw.locale, 16);
  if (locale) ctx.locale = locale;

  if (raw.focus && typeof raw.focus === 'object' && !Array.isArray(raw.focus)) {
    const focus = raw.focus as Record<string, unknown>;
    for (const key of Object.keys(focus)) {
      if (!FOCUS_KEYS.has(key)) {
        throw new BadRequestException('Malformed application context');
      }
    }
    const source =
      typeof focus.source === 'string' && FOCUS_SOURCES.has(focus.source)
        ? (focus.source as 'page' | 'manual')
        : undefined;
    const scope =
      typeof focus.scope === 'string' && FOCUS_SCOPES.has(focus.scope)
        ? (focus.scope as 'entity' | 'comparison' | 'global')
        : undefined;
    ctx.focus = {
      pinned: focus.pinned === true,
      source,
      scope,
    };
  }

  return ctx;
}
