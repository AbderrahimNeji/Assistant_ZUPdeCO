"use client";

import { Check, Circle, Loader2, Minus } from "lucide-react";

import type { ExecutionTrace } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type WorkflowProgressPanelProps = {
  workflow?: ExecutionTrace["workflow"];
  className?: string;
};

function StatusIcon({
  status,
}: {
  status: NonNullable<ExecutionTrace["workflow"]>["progress"][number]["status"];
}) {
  if (status === "completed") {
    return <Check className="size-3.5 text-brand-orange" aria-hidden />;
  }
  if (status === "running" || status === "awaiting_confirmation") {
    return (
      <Loader2
        className="size-3.5 animate-spin text-brand-orange"
        aria-hidden
      />
    );
  }
  if (status === "failed") {
    return <Minus className="size-3.5 text-destructive" aria-hidden />;
  }
  if (status === "skipped") {
    return <Minus className="size-3.5 text-muted-foreground/70" aria-hidden />;
  }
  return <Circle className="size-3 text-muted-foreground/50" aria-hidden />;
}

export function WorkflowProgressPanel({
  workflow,
  className,
}: WorkflowProgressPanelProps) {
  if (!workflow?.progress?.length) return null;

  return (
    <div
      className={cn(
        "mt-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5",
        className,
      )}
      aria-label={`Workflow ${workflow.name}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-brand-navy uppercase">
          {workflow.name}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {workflow.durationMs} ms · {workflow.status}
        </p>
      </div>
      <ol className="space-y-1.5">
        {workflow.progress.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-2 text-xs leading-snug text-foreground/90"
          >
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
              <StatusIcon status={step.status} />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "skipped" &&
                    "text-muted-foreground line-through",
                  step.status === "failed" && "text-destructive",
                )}
              >
                {step.name}
              </span>
              {step.status === "awaiting_confirmation" ? (
                <span className="ml-1 text-muted-foreground">
                  Waiting for confirmation…
                </span>
              ) : null}
              {step.status === "running" ? (
                <span className="ml-1 text-muted-foreground">In progress…</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
