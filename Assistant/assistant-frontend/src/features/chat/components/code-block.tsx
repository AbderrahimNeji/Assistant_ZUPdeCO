"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
};

export function CodeBlock({
  code,
  language = "text",
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const normalizedLanguage = language.trim() || "text";

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        copyTimeoutRef.current = null;
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div
      className={cn(
        "group my-3.5 overflow-hidden rounded-xl border border-border bg-[#fbfbfc] shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/55 px-3.5 py-2">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {normalizedLanguage}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs duration-150 hover:bg-brand-peach hover:text-brand-orange"
          onClick={handleCopy}
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? (
            <Check className="size-3.5 text-brand-orange" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={normalizedLanguage}
          style={oneLight}
          customStyle={{
            margin: 0,
            padding: "1rem 1.125rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: 1.65,
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
            },
          }}
          PreTag="div"
        >
          {code.replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
