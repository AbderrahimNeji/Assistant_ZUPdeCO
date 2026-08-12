"use client";

import type { BenchmarkHistoryPoint } from "@/features/benchmark/types";
import {
  formatPercent,
  formatScore,
} from "@/features/benchmark/utils/map-benchmark";
import { cn } from "@/lib/utils";

type BenchmarkHistoryChartProps = {
  runs: BenchmarkHistoryPoint[];
  className?: string;
};

export function BenchmarkHistoryChart({
  runs,
  className,
}: BenchmarkHistoryChartProps) {
  const points = runs.filter(
    (run) =>
      typeof run.successRate === "number" && !Number.isNaN(run.successRate),
  );

  if (points.length === 0) return null;

  return (
    <section
      aria-label="Success rate history"
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-card transition-opacity duration-200",
        className,
      )}
    >
      <div className="mb-3 space-y-0.5">
        <h2 className="font-display text-sm font-bold tracking-tight">
          Success rate trend
        </h2>
        <p className="text-xs text-muted-foreground">
          Chronological history ({points.length} runs). Hover a bar for score.
        </p>
      </div>

      <ul className="flex h-40 items-end gap-1.5">
        {points.map((run, index) => {
          const rate = Math.max(0, Math.min(1, run.successRate ?? 0));
          const height = `${Math.max(8, rate * 100)}%`;
          const label = run.dataset ?? `Run ${index + 1}`;
          const score =
            typeof run.averageSimilarity === "number"
              ? formatScore(run.averageSimilarity)
              : "—";

          return (
            <li
              key={run.id ?? `${label}-${index}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="sr-only">
                {label}: {formatPercent(rate)}, score {score}
              </span>
              <div
                className="w-full max-w-9 rounded-t-md bg-brand-orange/90 transition-[height] duration-300"
                style={{ height }}
                title={`${label} · ${formatPercent(rate)} · score ${score}`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
