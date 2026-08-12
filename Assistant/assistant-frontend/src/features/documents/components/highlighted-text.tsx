"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type HighlightedTextProps = {
  text: string;
  query: string;
  className?: string;
};

/** Highlights case-insensitive query matches inside `text`. */
export function HighlightedText({
  text,
  query,
  className,
}: HighlightedTextProps) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return <span className={className}>{text}</span>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    const end = matchIndex + normalizedQuery.length;
    parts.push(
      <mark
        key={`${matchIndex}-${end}`}
        className="rounded-sm bg-brand-orange/25 px-0.5 text-inherit"
      >
        {text.slice(matchIndex, end)}
      </mark>,
    );

    cursor = end;
    matchIndex = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <span className={cn(className)}>{parts}</span>;
}
