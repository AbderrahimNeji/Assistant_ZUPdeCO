"use client";

import { ArrowLeftRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BenchmarkRun } from "@/features/benchmark/types";
import {
  deltaClass,
  formatLatency,
  formatPercent,
  formatScore,
  metricDelta,
} from "@/features/benchmark/utils/map-benchmark";
import { cn } from "@/lib/utils";

type BenchmarkComparePanelProps = {
  left: BenchmarkRun | null;
  right: BenchmarkRun | null;
  onClear: () => void;
  className?: string;
};

type CompareRow = {
  label: string;
  left: string;
  right: string;
  signedDelta: number | null;
  note?: string;
};

export function BenchmarkComparePanel({
  left,
  right,
  onClear,
  className,
}: BenchmarkComparePanelProps) {
  if (!left || !right) return null;

  const rows: CompareRow[] = [
    {
      label: "Overall score",
      left: formatScore(left.averageSimilarity),
      right: formatScore(right.averageSimilarity),
      signedDelta: metricDelta(
        right.averageSimilarity,
        left.averageSimilarity,
        true,
      ),
    },
    {
      label: "Precision",
      left: formatPercent(left.precision),
      right: formatPercent(right.precision),
      signedDelta: metricDelta(right.precision, left.precision, true),
      note: "Not provided by the current evaluator",
    },
    {
      label: "Recall",
      left: formatPercent(left.recall),
      right: formatPercent(right.recall),
      signedDelta: metricDelta(right.recall, left.recall, true),
      note: "Not provided by the current evaluator",
    },
    {
      label: "Pass rate",
      left: formatPercent(left.successRate),
      right: formatPercent(right.successRate),
      signedDelta: metricDelta(right.successRate, left.successRate, true),
    },
    {
      label: "Avg latency",
      left: formatLatency(left.averageLatency),
      right: formatLatency(right.averageLatency),
      signedDelta: metricDelta(
        right.averageLatency,
        left.averageLatency,
        false,
      ),
    },
    {
      label: "Token usage",
      left:
        typeof left.tokenUsage === "number"
          ? String(left.tokenUsage)
          : "—",
      right:
        typeof right.tokenUsage === "number"
          ? String(right.tokenUsage)
          : "—",
      signedDelta: metricDelta(right.tokenUsage, left.tokenUsage, false),
      note: "Not tracked by the current pipeline",
    },
  ];

  return (
    <section
      aria-label="Benchmark comparison"
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-card md:p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-tight">
            <ArrowLeftRight className="size-4 text-brand-orange" aria-hidden />
            Compare runs
          </h2>
          <p className="text-xs text-muted-foreground">
            Baseline → candidate. Green means improvement for the candidate.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="size-3.5" aria-hidden />
          Clear comparison
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <CompareHeader label="Baseline" run={left} />
        <CompareHeader label="Candidate" run={right} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-y border-border/70 bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Metric</th>
              <th className="px-3 py-2 font-semibold">Baseline</th>
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 font-semibold">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/60">
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-foreground">{row.label}</p>
                  {row.note ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.note}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-display font-semibold">
                  {row.left}
                </td>
                <td className="px-3 py-3 font-display font-semibold">
                  {row.right}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 font-display font-semibold",
                    deltaClass(row.signedDelta),
                  )}
                >
                  {formatSignedDelta(row.signedDelta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompareHeader({
  label,
  run,
}: {
  label: string;
  run: BenchmarkRun;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-sm font-semibold">
        {run.name}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {run.dataset} · {run.totalQuestions} questions
      </p>
    </div>
  );
}

function formatSignedDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (Math.abs(delta) < 1e-9) return "0";
  const abs =
    Math.abs(delta) >= 1 ? delta.toFixed(2) : delta.toFixed(3);
  return delta > 0 ? `+${abs}` : abs;
}
