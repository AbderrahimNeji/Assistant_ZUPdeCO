/**
 * Resolve {{path}} templates against a context bag.
 */
export function resolveTemplates(
  value: unknown,
  ctx: Record<string, unknown>,
): unknown {
  if (typeof value === 'string') {
    const full = value.match(/^\{\{\s*([^}]+)\s*\}\}$/);
    if (full) {
      return getPath(ctx, full[1].trim());
    }
    return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, path: string) => {
      const resolved = getPath(ctx, path.trim());
      if (resolved == null) return '';
      if (typeof resolved === 'string') return resolved;
      if (typeof resolved === 'number' || typeof resolved === 'boolean') {
        return String(resolved);
      }
      try {
        return JSON.stringify(resolved);
      } catch {
        return '';
      }
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplates(item, ctx));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = resolveTemplates(child, ctx);
    }
    return out;
  }

  return value;
}

export function getPath(source: unknown, path: string): unknown {
  if (!path) return source;
  const parts = path.split('.').filter(Boolean);
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return;
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const next = cursor[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

export function applyOutputMapping(
  state: Record<string, unknown>,
  mapping: Record<string, string> | undefined,
  result: unknown,
): void {
  if (!mapping) return;
  const text = readText(result);
  const bag = {
    result,
    data: result,
    text,
    state,
  };
  for (const [stateKey, resultPath] of Object.entries(mapping)) {
    const normalized =
      resultPath === 'text' ||
      resultPath.startsWith('result.') ||
      resultPath.startsWith('data.') ||
      resultPath.startsWith('state.')
        ? resultPath
        : `result.${resultPath}`;
    const value = getPath(bag, normalized);
    setPath(state, stateKey, value);
  }
}

function readText(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'text' in result) {
    const text = (result as { text?: unknown }).text;
    if (typeof text === 'string') return text;
  }
  if (result && typeof result === 'object' && 'message' in result) {
    const message = (result as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
