"use client";

import { Loader2 } from "lucide-react";

import type { BenchmarkJobProgress } from "@/features/benchmark/types";
import {
  formatEta,
  formatLatency,
} from "@/features/benchmark/utils/map-benchmark";
import { cn } from "@/lib/utils";

type BenchmarkProgressBannerProps = {
  progress: BenchmarkJobProgress | null;
  dataset?: string | null;
  className?: string;
};

export function BenchmarkProgressBanner({
  progress,
  dataset,
  className,
}: BenchmarkProgressBannerProps) {
  if (!progress && !dataset) return null;

  const percent = progress?.percent ?? 0;
  const label = progress?.dataset ?? dataset ?? "benchmark";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-xl border border-brand-orange/35 bg-brand-peach px-4 py-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <Loader2
              className="size-4 animate-spin text-brand-orange"
              aria-hidden
            />
            Running “{label}”
          </p>
          <p className="text-xs text-muted-foreground">
            {progress?.currentQuestion
              ? `Current question: ${progress.currentQuestion}`
              : "Preparing questions…"}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            {progress
              ? `${progress.current}/${progress.total} · ${percent}%`
              : "Starting…"}
          </p>
          <p>
            Elapsed {formatLatency(progress?.elapsedMs ?? 0)}
            {progress?.etaMs != null
              ? ` · ETA ${formatEta(progress.etaMs)}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-orange transition-[width] duration-300"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
    </div>
  );
}
