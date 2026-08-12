"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import type { ExecutionTrace } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type ExecutionInspectorProps = {
  trace?: ExecutionTrace;
  className?: string;
};

function showVerboseDetails(trace: ExecutionTrace): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.NEXT_PUBLIC_EXECUTION_INSPECTOR === "1") return true;
  return Boolean(trace.planner.executionPlan);
}

function formatMs(value?: number): string {
  if (typeof value !== "number") return "—";
  return `${value} ms`;
}

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function InspectorCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-brand-navy uppercase">
        {title}
      </p>
      <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-foreground/80">{label}: </span>
      {value}
    </p>
  );
}

export function ExecutionInspector({
  trace,
  className,
}: ExecutionInspectorProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  if (!trace) return null;

  const verbose = showVerboseDetails(trace);
  const providers =
    trace.knowledge.applicationDbProviders.length > 0
      ? trace.knowledge.applicationDbProviders.join(", ")
      : "None";

  return (
    <section
      aria-label="How this answer was generated"
      className={cn("mt-3 border-t border-border/60 pt-3", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left",
          "text-[11px] font-semibold tracking-wide text-brand-navy uppercase",
          "transition-colors hover:bg-brand-peach/40 focus-visible:bg-brand-peach/40",
          "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        )}
      >
        <span className="flex-1">How this answer was generated</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="mt-2 grid gap-2 sm:grid-cols-2">
          <InspectorCard title="Planner">
            <Row label="Mode" value={trace.planner.mode} />
            <Row
              label="Confidence"
              value={formatConfidence(trace.planner.confidence)}
            />
            <Row label="Decision" value={trace.planner.reasoningSummary} />
            {verbose && trace.planner.selectedTools.length > 0 ? (
              <Row
                label="Selected tools"
                value={trace.planner.selectedTools
                  .map((tool) => tool.id)
                  .join(" → ")}
              />
            ) : null}
            {verbose && trace.planner.executionPlan ? (
              <Row
                label="Plan"
                value={
                  trace.planner.executionPlan.steps.length
                    ? trace.planner.executionPlan.steps
                        .map((step) => step.toolId)
                        .join(" → ")
                    : "RAG only"
                }
              />
            ) : null}
          </InspectorCard>

          <InspectorCard title="Knowledge used">
            <Row
              label="Conversation attachments"
              value={String(trace.knowledge.conversationAttachments)}
            />
            <Row
              label="Knowledge base"
              value={String(trace.knowledge.documentKb)}
            />
            <Row label="Application database" value={providers} />
          </InspectorCard>

          <InspectorCard title="Actions">
            {trace.toolExecution.length === 0 ? (
              <p>No application tools were executed.</p>
            ) : (
              trace.toolExecution.map((item, index) => (
                <div key={`${item.toolId}-${index}`} className="space-y-0.5">
                  <Row label="Tool" value={item.toolId} />
                  <Row label="Duration" value={formatMs(item.durationMs)} />
                  <Row
                    label="Result"
                    value={
                      item.status ?? (item.success ? "success" : "failed")
                    }
                  />
                  {item.confirmationRequired ? (
                    <Row
                      label="Confirmation"
                      value={
                        item.confirmationCompleted
                          ? "Completed"
                          : "Required"
                      }
                    />
                  ) : null}
                </div>
              ))
            )}
          </InspectorCard>

          {trace.workflow ? (
            <InspectorCard title="Workflow">
              <Row label="Id" value={trace.workflow.id} />
              <Row label="Name" value={trace.workflow.name} />
              <Row label="Status" value={trace.workflow.status} />
              <Row
                label="Duration"
                value={formatMs(trace.workflow.durationMs)}
              />
              <Row
                label="Completed"
                value={
                  trace.workflow.completedSteps.length
                    ? trace.workflow.completedSteps.join(" → ")
                    : "—"
                }
              />
              {trace.workflow.failedSteps.length ? (
                <Row
                  label="Failed"
                  value={trace.workflow.failedSteps.join(", ")}
                />
              ) : null}
              {trace.workflow.skippedSteps.length ? (
                <Row
                  label="Skipped"
                  value={trace.workflow.skippedSteps.join(", ")}
                />
              ) : null}
            </InspectorCard>
          ) : null}

          <InspectorCard title="Performance">
            <Row label="Total" value={formatMs(trace.timing.totalMs)} />
            <Row label="Retrieval" value={formatMs(trace.timing.retrievalMs)} />
            <Row label="Tools" value={formatMs(trace.timing.toolMs)} />
            <Row
              label="Generation"
              value={formatMs(trace.timing.generationMs)}
            />
            {verbose && trace.llm ? (
              <>
                <Row label="Model" value={trace.llm.modelName} />
                {typeof trace.llm.inputTokens === "number" ? (
                  <Row
                    label="Input tokens"
                    value={String(trace.llm.inputTokens)}
                  />
                ) : null}
                {typeof trace.llm.outputTokens === "number" ? (
                  <Row
                    label="Output tokens"
                    value={String(trace.llm.outputTokens)}
                  />
                ) : null}
              </>
            ) : null}
          </InspectorCard>

          <div className="sm:col-span-2">
            <InspectorCard title="Why this path">
              <p className="text-foreground/85">{trace.decisionSummary}</p>
              {verbose ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Request {trace.requestId}
                </p>
              ) : null}
            </InspectorCard>
          </div>
        </div>
      ) : null}
    </section>
  );
}
