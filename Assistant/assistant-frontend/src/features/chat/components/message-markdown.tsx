"use client";

import dynamic from "next/dynamic";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const CodeBlock = dynamic(
  () =>
    import("@/features/chat/components/code-block").then(
      (module) => module.CodeBlock,
    ),
  {
    ssr: false,
    loading: () => (
      <pre className="my-3.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-[0.8125rem] leading-relaxed text-foreground">
        Loading code…
      </pre>
    ),
  },
);

type MessageMarkdownProps = {
  content: string;
  className?: string;
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2.5 font-display text-xl font-bold tracking-tight text-brand-navy first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 font-display text-lg font-bold tracking-tight text-brand-navy first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3.5 mb-1.5 font-display text-base font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-2.5 whitespace-pre-wrap text-[0.9375rem] leading-[1.7] text-foreground/95 last:mb-0 first:mt-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2.5 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-[1.7]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2.5 list-decimal space-y-1.5 pl-5 text-[0.9375rem] leading-[1.7]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.7] [&>p]:my-1">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-orange underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");
    const isBlock = Boolean(match) || code.includes("\n");

    if (isBlock) {
      return <CodeBlock code={code} language={match?.[1] ?? "text"} />;
    }

    return (
      <code
        className="rounded-md border border-border/70 bg-muted/80 px-1.5 py-0.5 font-mono text-[0.84em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="my-3.5 rounded-r-xl border-l-4 border-brand-orange/55 bg-brand-peach/60 py-1.5 pr-3 pl-4 text-[0.9375rem] text-foreground/90 italic [&>p]:my-1.5">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-border" />,
  table: ({ children }) => (
    <div className="my-3.5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/70 text-[11px] tracking-wide text-muted-foreground uppercase">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 align-top text-foreground/90">{children}</td>
  ),
};

export function MessageMarkdown({ content, className }: MessageMarkdownProps) {
  // Cap extremely large payloads to keep the main thread responsive.
  const LARGE_MARKDOWN_CHARS = 80_000;
  const isLarge = content.length > LARGE_MARKDOWN_CHARS;
  const rendered = isLarge
    ? `${content.slice(0, LARGE_MARKDOWN_CHARS)}\n\n…(truncated for performance)`
    : content;

  return (
    <div className={cn("max-w-none break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {rendered}
      </ReactMarkdown>
    </div>
  );
}
