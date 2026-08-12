/**
 * Convert common LaTeX/KaTeX/MathJax snippets to plain Unicode text
 * so chat users never see raw backslash commands.
 */

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  n: 'ⁿ',
  i: 'ⁱ',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  n: 'ₙ',
  i: 'ᵢ',
  a: 'ₐ',
  e: 'ₑ',
  o: 'ₒ',
  x: 'ₓ',
};

const SIMPLE_CMDS: Record<string, string> = {
  approx: '≈',
  times: '×',
  cdot: '·',
  pm: '±',
  mp: '∓',
  leq: '≤',
  geq: '≥',
  le: '≤',
  ge: '≥',
  neq: '≠',
  ne: '≠',
  infty: '∞',
  pi: 'π',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  sigma: 'σ',
  omega: 'ω',
  sum: '∑',
  prod: '∏',
  int: '∫',
  cdots: '⋯',
  ldots: '…',
  dots: '…',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  Leftrightarrow: '⇔',
  mid: '|',
  div: '÷',
  degree: '°',
  circ: '°',
  percent: '%',
  quad: ' ',
  qquad: '  ',
  thinspace: ' ',
};

function extractBalanced(
  src: string,
  openIdx: number,
): { inner: string; end: number } | null {
  if (src[openIdx] !== '{') return null;
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { inner: src.slice(openIdx + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

function toScript(text: string, map: Record<string, string>): string {
  let out = '';
  for (const ch of text) {
    out += map[ch] ?? ch;
  }
  return out;
}

/** Superscripts: ^{...} and ^2 — safe (markdown does not use ^). */
function replaceSuperscripts(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '^' && i + 1 < src.length) {
      if (src[i + 1] === '{') {
        const bal = extractBalanced(src, i + 1);
        if (bal) {
          out += toScript(bal.inner, SUPERSCRIPTS);
          i = bal.end;
          continue;
        }
      }
      const next = src[i + 1];
      if (SUPERSCRIPTS[next]) {
        out += SUPERSCRIPTS[next];
        i += 2;
        continue;
      }
    }
    out += src[i];
    i += 1;
  }
  return out;
}

/**
 * Subscripts only as _{...} — never bare _x, which would break markdown italics.
 */
function replaceBraceSubscripts(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '_' && src[i + 1] === '{') {
      const bal = extractBalanced(src, i + 1);
      if (bal) {
        out += toScript(bal.inner, SUBSCRIPTS);
        i = bal.end;
        continue;
      }
    }
    out += src[i];
    i += 1;
  }
  return out;
}

function replaceFrac(src: string): string {
  const re = /\\(?:d|t)?frac\s*/g;
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    out += src.slice(last, match.index);
    let pos = match.index + match[0].length;
    const num = extractBalanced(src, pos);
    if (!num) {
      out += match[0];
      last = match.index + match[0].length;
      continue;
    }
    pos = num.end;
    while (src[pos] === ' ') pos += 1;
    const den = extractBalanced(src, pos);
    if (!den) {
      out += match[0];
      last = match.index + match[0].length;
      continue;
    }
    out += `${num.inner}/${den.inner}`;
    last = den.end;
    re.lastIndex = den.end;
  }
  out += src.slice(last);
  return out;
}

function replaceSqrt(src: string): string {
  const re = /\\sqrt\s*/g;
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    out += src.slice(last, match.index);
    let pos = match.index + match[0].length;
    let index: string | null = null;
    if (src[pos] === '[') {
      const close = src.indexOf(']', pos + 1);
      if (close !== -1) {
        index = src.slice(pos + 1, close);
        pos = close + 1;
      }
    }
    while (src[pos] === ' ') pos += 1;
    const arg = extractBalanced(src, pos);
    if (!arg) {
      out += '√';
      last = match.index + match[0].length;
      re.lastIndex = last;
      continue;
    }
    out += index ? `√[${index}]${arg.inner}` : `√${arg.inner}`;
    last = arg.end;
    re.lastIndex = arg.end;
  }
  out += src.slice(last);
  return out;
}

function replaceWrapped(src: string): string {
  const re =
    /\\(?:text|mathrm|mathbf|mathit|mathsf|textbf|textit|operatorname|mbox|textrm|textup)\s*/g;
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    out += src.slice(last, match.index);
    const pos = match.index + match[0].length;
    const arg = extractBalanced(src, pos);
    if (!arg) {
      out += match[0];
      last = match.index + match[0].length;
      continue;
    }
    out += arg.inner;
    last = arg.end;
    re.lastIndex = arg.end;
  }
  out += src.slice(last);
  return out;
}

function convertLatexCommands(src: string): string {
  let s = src;
  for (let pass = 0; pass < 8; pass++) {
    const prev = s;
    s = replaceFrac(s);
    s = replaceSqrt(s);
    s = replaceWrapped(s);
    s = replaceSuperscripts(s);
    s = replaceBraceSubscripts(s);
    s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\s*/g, '');
    s = s.replace(/\\([a-zA-Z]+)\*?/g, (full, name: string) =>
      Object.prototype.hasOwnProperty.call(SIMPLE_CMDS, name)
        ? SIMPLE_CMDS[name]
        : full,
    );
    s = s.replace(/\\[,:;!] ?/g, ' ');
    s = s.replace(/\\ /g, ' ');
    s = s.replace(/\\([%_&#$])/g, '$1');
    s = s.replace(/\\([{|}])/g, '$1');
    if (s === prev) break;
  }

  // Drop unknown remaining letter commands rather than showing raw LaTeX.
  s = s.replace(/\\[a-zA-Z]+\*?/g, '');
  s = s.replace(/\\[{}]/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s;
}

function sanitizeChunk(input: string): string {
  // Convert delimited math first (keep inner content, then strip delimiters).
  let s = input.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner: string) =>
    convertLatexCommands(inner),
  );
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) =>
    convertLatexCommands(inner),
  );
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) =>
    convertLatexCommands(inner),
  );
  s = s.replace(/\$([^$\n]+)\$/g, (_m, inner: string) =>
    convertLatexCommands(inner),
  );

  // Also convert bare commands models emit without math delimiters.
  return convertLatexCommands(s);
}

/** Map text outside fenced/inline code so code samples stay intact. */
function mapOutsideCode(input: string, fn: (chunk: string) => string): string {
  return input
    .split(/(```[\s\S]*?```|`[^`\n]+`)/g)
    .map((part) => (part.startsWith('`') ? part : fn(part)))
    .join('');
}

/**
 * Convert common LaTeX math markup to readable Unicode plain text.
 * Safe for partial streaming content (unclosed `$` is left alone until closed).
 */
export function latexToPlainText(input: string): string {
  if (!input || !/[\\$]/.test(input)) return input;
  return mapOutsideCode(input, sanitizeChunk);
}
