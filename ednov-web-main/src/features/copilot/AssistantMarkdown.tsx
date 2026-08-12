import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

import { cn } from '@/lib/utils';
import { latexToPlainText } from './latexToPlainText';

function sanitizeMarkdownHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return undefined;
  }
  if (
    lower.startsWith('https:') ||
    lower.startsWith('http:') ||
    lower.startsWith('mailto:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return undefined;
}

const BRAND =
  'var(--brand-primary,var(--color-1-nuance-1,#e85d04))';

const components: Components = {
  h1: ({ children }) => (
    <h1
      className="mb-2 mt-3 border-b border-border/60 pb-1.5 text-[15px] font-semibold leading-snug tracking-tight text-foreground first:mt-0"
      style={{ borderBottomColor: `color-mix(in srgb, ${BRAND} 22%, transparent)` }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-3 text-[14px] font-semibold leading-snug tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="mb-1 mt-2.5 text-[13px] font-semibold leading-snug first:mt-0"
      style={{ color: BRAND }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-2 text-[13px] font-semibold leading-snug text-foreground/90 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-1.5 text-[13px] leading-relaxed text-foreground/90 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground/85">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 list-none space-y-1.5 pl-0 first:mt-0 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-muted-foreground first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[13px] leading-relaxed text-foreground/90 [&>p]:my-0 [&>ul]:mt-1.5 [&>ol]:mt-1.5">
      {children}
    </li>
  ),
  a: ({ href, children }) => {
    const safeHref = sanitizeMarkdownHref(href);
    if (!safeHref) {
      return <span className="font-medium">{children}</span>;
    }
    return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline decoration-[color-mix(in_srgb,var(--brand-primary,var(--color-1-nuance-1,#e85d04))_45%,transparent)] underline-offset-2 transition hover:opacity-80"
      style={{ color: BRAND }}
    >
      {children}
    </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote
      className="my-2 border-l-[3px] py-0.5 pl-3 text-[13px] leading-relaxed text-muted-foreground first:mt-0 last:mb-0"
      style={{ borderLeftColor: `color-mix(in srgb, ${BRAND} 55%, transparent)` }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr
      className="my-3 border-0 border-t border-border/70"
      style={{ borderTopColor: `color-mix(in srgb, ${BRAND} 18%, transparent)` }}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = typeof className === 'string' && className.includes('language-');
    if (isBlock) {
      return (
        <code className={cn('font-mono text-[12px] leading-relaxed text-foreground', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[12px] text-foreground ring-1 ring-border/60"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-background/90 px-3 py-2.5 font-mono text-[12px] leading-relaxed ring-1 ring-border/70 first:mt-0 last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto first:mt-0 last:mb-0">
      <table className="w-full min-w-[12rem] border-collapse text-left text-[12px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-background/60">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border/70">{children}</tbody>,
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 text-foreground/90">{children}</td>
  ),
};

type AssistantMarkdownProps = {
  content: string;
  className?: string;
};

/**
 * Renders assistant reply markdown with chat-native hierarchy
 * (headings, lists, code, tables). Safe for partial streaming content.
 * LaTeX/KaTeX leftovers are converted to plain Unicode before render.
 */
export function AssistantMarkdown({ content, className }: AssistantMarkdownProps) {
  const displayContent = latexToPlainText(content);

  return (
    <div
      className={cn(
        'assistant-md min-w-0 break-words text-[13px] leading-relaxed text-foreground',
        /* Orange bullet markers for unordered lists — chat-native, brand-aligned */
        '[&_ul>li]:relative [&_ul>li]:pl-4',
        '[&_ul>li]:before:absolute [&_ul>li]:before:left-0.5 [&_ul>li]:before:top-[0.55em]',
        '[&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:rounded-full',
        '[&_ul>li]:before:bg-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
        '[&_ul>li]:before:content-[""]',
        /* Bold-only paragraphs act as section labels (common model output) */
        '[&_p:has(>strong:only-child)]:mt-2.5 [&_p:has(>strong:only-child)]:mb-1',
        '[&_p:has(>strong:only-child)]:text-[13.5px] [&_p:has(>strong:only-child)]:leading-snug',
        '[&_p:has(>strong:only-child)]:first:mt-0',
        '[&_p:has(>strong:only-child)>strong]:tracking-tight',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) => sanitizeMarkdownHref(url) ?? ''}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}
