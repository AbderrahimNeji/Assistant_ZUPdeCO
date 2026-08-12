"use client";

import { Check, Circle, Loader2, Minus, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  WorkflowJob,
  WorkflowJobProgressStep,
} from "@/features/chat/services/workflow-jobs.api";
import { cn } from "@/lib/utils";

type WorkflowJobsPanelProps = {
  jobs: WorkflowJob[];
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  cancelPending?: boolean;
  retryPending?: boolean;
  className?: string;
};

const ACTIVE = new Set([
  "QUEUED",
  "RUNNING",
  "WAITING_CONFIRMATION",
]);

function StepIcon({ status }: { status: WorkflowJobProgressStep["status"] }) {
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

function JobCard({
  job,
  onCancel,
  onRetry,
  busy,
}: {
  job: WorkflowJob;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  busy: boolean;
}) {
  const progress = Array.isArray(job.progress) ? job.progress : [];
  const active = ACTIVE.has(job.status);
  const canRetry = job.status === "FAILED" || job.status === "CANCELLED";
  const canCancel =
    job.status === "QUEUED" ||
    job.status === "RUNNING" ||
    job.status === "WAITING_CONFIRMATION";

  return (
    <article
      className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5"
      aria-label={`${job.workflowName ?? job.workflowId} — ${job.status}`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-brand-navy">
            {job.workflowName ?? job.workflowId}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {job.status.replaceAll("_", " ").toLowerCase()}
            {job.currentStep ? ` · ${job.currentStep}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={busy}
              onClick={() => onCancel(job.id)}
            >
              <X className="size-3" aria-hidden />
              Cancel
            </Button>
          ) : null}
          {canRetry ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={busy}
              onClick={() => onRetry(job.id)}
            >
              <RotateCcw className="size-3" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>
      </div>

      {progress.length ? (
        <ol className="space-y-1">
          {progress.map((step) => (
            <li
              key={step.id}
              className="flex items-start gap-2 text-[11px] leading-snug"
            >
              <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
                <StepIcon status={step.status} />
              </span>
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
            </li>
          ))}
        </ol>
      ) : null}

      {job.status === "FAILED" && job.error ? (
        <p className="mt-2 text-[11px] text-destructive">{job.error}</p>
      ) : null}

      {!active && job.status === "COMPLETED" ? (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Result added to the conversation.
        </p>
      ) : null}
    </article>
  );
}

export function WorkflowJobsPanel({
  jobs,
  onCancel,
  onRetry,
  cancelPending,
  retryPending,
  className,
}: WorkflowJobsPanelProps) {
  if (!jobs.length) return null;

  const running = jobs.filter((job) => ACTIVE.has(job.status));
  const completed = jobs.filter((job) => !ACTIVE.has(job.status)).slice(0, 5);
  const busy = Boolean(cancelPending || retryPending);

  return (
    <section
      className={cn(
        "mb-2 space-y-2 rounded-2xl border border-border/60 bg-background/80 px-3 py-2.5",
        className,
      )}
      aria-label="Background workflow jobs"
    >
      {running.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Running background jobs
          </p>
          {running.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={onCancel}
              onRetry={onRetry}
              busy={busy}
            />
          ))}
        </div>
      ) : null}

      {completed.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Completed jobs
          </p>
          {completed.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={onCancel}
              onRetry={onRetry}
              busy={busy}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
