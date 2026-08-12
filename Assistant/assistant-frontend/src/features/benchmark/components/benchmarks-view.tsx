"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  BarChart3,
  Loader2,
  Play,
  RefreshCw,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BenchmarkComparePanel } from "@/features/benchmark/components/benchmark-compare-panel";
import { BenchmarkDetailsPanel } from "@/features/benchmark/components/benchmark-details-panel";
import { BenchmarkFiltersBar } from "@/features/benchmark/components/benchmark-filters-bar";
import { BenchmarkHistoryChart } from "@/features/benchmark/components/benchmark-history-chart";
import { BenchmarkProgressBanner } from "@/features/benchmark/components/benchmark-progress-banner";
import { BenchmarkRunCard } from "@/features/benchmark/components/benchmark-run-card";
import { RunBenchmarkDialog } from "@/features/benchmark/components/run-benchmark-dialog";
import { useBenchmark } from "@/features/benchmark/hooks/use-benchmark";
import { useBenchmarkDatasets } from "@/features/benchmark/hooks/use-benchmark-datasets";
import { useBenchmarkHistory } from "@/features/benchmark/hooks/use-benchmark-history";
import { useBenchmarks } from "@/features/benchmark/hooks/use-benchmarks";
import { useRunBenchmark } from "@/features/benchmark/hooks/use-run-benchmark";
import type {
  BenchmarkListFilters,
  BenchmarkRun,
} from "@/features/benchmark/types";
import { PageContainer } from "@/features/shared/components";
import { toast } from "@/features/shared/store/toast.store";
import { cn } from "@/lib/utils";

function BenchmarksSkeleton() {
  return (
    <div
      className="grid gap-3"
      role="status"
      aria-label="Loading benchmarks"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-2xl bg-muted" />
      ))}
      <span className="sr-only">Loading benchmarks…</span>
    </div>
  );
}

export function BenchmarksView() {
  const [filters, setFilters] = useState<BenchmarkListFilters>({
    status: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  const benchmarksQuery = useBenchmarks(filters);
  const historyQuery = useBenchmarkHistory(filters);
  const datasetsQuery = useBenchmarkDatasets();
  const runBenchmark = useRunBenchmark();
  const {
    progress: runProgress,
    reset: resetRunProgress,
    isRunning,
    activeDataset,
    start: startBenchmark,
  } = runBenchmark;

  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const detailQuery = useBenchmark(selectedRunId);

  const runs = useMemo(
    () => benchmarksQuery.data ?? [],
    [benchmarksQuery.data],
  );

  const visibleRuns = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return runs;
    return runs.filter((run) => {
      const haystack = [
        run.dataset,
        run.name,
        run.model ?? "",
        run.runId,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [runs, deferredSearch]);

  const historyRuns = historyQuery.data?.runs ?? [];
  const detailRun = detailQuery.data ?? null;

  const compareRuns = useMemo(() => {
    if (compareIds.length !== 2) return { left: null, right: null };
    const left = runs.find((run) => run.runId === compareIds[0]) ?? null;
    const right = runs.find((run) => run.runId === compareIds[1]) ?? null;
    return { left, right };
  }, [compareIds, runs]);

  useEffect(() => {
    if (!runProgress) return;

    if (runProgress.status === "completed" && runProgress.runId) {
      toast({
        title: "Benchmark finished",
        description: `“${runProgress.dataset}” completed successfully.`,
        variant: "success",
      });
      setSelectedRunId(runProgress.runId);
      resetRunProgress();
      return;
    }

    if (runProgress.status === "failed") {
      toast({
        title: "Benchmark failed",
        description: runProgress.error || "The benchmark job failed.",
        variant: "error",
      });
      resetRunProgress();
    }
  }, [runProgress, resetRunProgress]);

  function handleOpenRun(run: BenchmarkRun) {
    setSelectedRunId(run.runId);
  }

  function handleToggleCompare(run: BenchmarkRun) {
    setCompareIds((current) => {
      if (current.includes(run.runId)) {
        return current.filter((id) => id !== run.runId);
      }
      if (current.length >= 2) {
        return [current[1]!, run.runId];
      }
      return [...current, run.runId];
    });
  }

  function handleConfirmRun(dataset: string) {
    startBenchmark(dataset, {
      onSuccess: () => {
        setRunDialogOpen(false);
        toast({
          title: "Benchmark started",
          description: `Evaluating “${dataset}”. Progress updates below.`,
          variant: "default",
        });
      },
      onError: (error) => {
        toast({
          title: "Couldn’t start benchmark",
          description: getErrorMessage(error),
          variant: "error",
        });
      },
    });
  }

  const hasActiveSearch = deferredSearch.trim().length > 0;
  const datasetsForFilter = useMemo(() => {
    const fromApi = datasetsQuery.data ?? [];
    const fromRuns = runs.map((run) => run.dataset);
    return Array.from(new Set([...fromApi, ...fromRuns])).sort();
  }, [datasetsQuery.data, runs]);

  return (
    <PageContainer
      title="Benchmarks"
      description="Evaluate retrieval and answer quality across curated test sets."
      actions={
        <Button
          type="button"
          variant="brand"
          onClick={() => setRunDialogOpen(true)}
          disabled={isRunning}
          aria-busy={isRunning}
        >
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          {isRunning ? "Running…" : "Run benchmark"}
        </Button>
      }
    >
      <div className="space-y-6">
        {isRunning ? (
          <BenchmarkProgressBanner
            progress={runProgress}
            dataset={activeDataset}
          />
        ) : null}

        <BenchmarkFiltersBar
          datasets={datasetsForFilter}
          filters={filters}
          searchQuery={searchQuery}
          onFiltersChange={setFilters}
          onSearchChange={setSearchQuery}
        />

        {compareRuns.left && compareRuns.right ? (
          <BenchmarkComparePanel
            left={compareRuns.left}
            right={compareRuns.right}
            onClear={() => setCompareIds([])}
          />
        ) : null}

        {!historyQuery.isLoading &&
        !historyQuery.isError &&
        historyRuns.length > 0 ? (
          <BenchmarkHistoryChart runs={historyRuns} />
        ) : null}

        {historyQuery.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3"
          >
            <p className="text-sm text-destructive">
              Couldn’t load benchmark history chart.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void historyQuery.refetch()}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Retry
            </Button>
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                Run history
              </h2>
              <p className="text-xs text-muted-foreground">
                Select up to two runs to compare · {visibleRuns.length} shown
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void benchmarksQuery.refetch()}
              disabled={benchmarksQuery.isFetching}
              aria-label="Refresh benchmark list"
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  benchmarksQuery.isFetching && "animate-spin",
                )}
                aria-hidden
              />
              Refresh
            </Button>
          </div>

          {benchmarksQuery.isLoading ? <BenchmarksSkeleton /> : null}

          {benchmarksQuery.isError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-10 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-semibold">
                  Couldn’t load benchmarks
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your connection and try again.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void benchmarksQuery.refetch()}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Retry
              </Button>
            </div>
          ) : null}

          {!benchmarksQuery.isLoading &&
          !benchmarksQuery.isError &&
          runs.length === 0 ? (
            <div
              role="status"
              className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-brand-peach text-brand-orange">
                <BarChart3 className="size-6" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="font-display text-sm font-semibold">
                  No benchmarks yet
                </p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Run a benchmark against an available dataset to see history,
                  comparisons, and exports here.
                </p>
              </div>
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={() => setRunDialogOpen(true)}
                disabled={isRunning}
              >
                <Play className="size-3.5" aria-hidden />
                Run your first benchmark
              </Button>
            </div>
          ) : null}

          {!benchmarksQuery.isLoading &&
          !benchmarksQuery.isError &&
          runs.length > 0 &&
          visibleRuns.length === 0 ? (
            <div
              role="status"
              className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <SearchX className="size-6" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="font-display text-sm font-semibold">
                  No matching benchmarks
                </p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {hasActiveSearch
                    ? `Nothing matched “${deferredSearch.trim()}”.`
                    : "Try adjusting dataset, date, or status filters."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilters({ status: "all" });
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}

          {!benchmarksQuery.isLoading &&
          !benchmarksQuery.isError &&
          visibleRuns.length > 0 ? (
            <ul className="grid gap-3 transition-opacity duration-200">
              {visibleRuns.map((run) => (
                <li key={run.runId}>
                  <BenchmarkRunCard
                    run={run}
                    onOpen={handleOpenRun}
                    selectedForCompare={compareIds.includes(run.runId)}
                    compareDisabled={
                      compareIds.length >= 2 &&
                      !compareIds.includes(run.runId)
                    }
                    onToggleCompare={handleToggleCompare}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <RunBenchmarkDialog
        open={runDialogOpen}
        datasets={datasetsQuery.data ?? []}
        isLoadingDatasets={datasetsQuery.isLoading}
        isDatasetsError={datasetsQuery.isError}
        onRetryDatasets={() => {
          void datasetsQuery.refetch();
        }}
        isRunning={isRunning}
        onCancel={() => {
          if (!isRunning) setRunDialogOpen(false);
        }}
        onConfirm={handleConfirmRun}
      />

      <BenchmarkDetailsPanel
        open={Boolean(selectedRunId)}
        run={detailRun}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        onRetry={() => void detailQuery.refetch()}
        onClose={() => setSelectedRunId(null)}
      />
    </PageContainer>
  );
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) {
      return message.filter(Boolean).join(". ");
    }
    if (!error.response) return "Unable to reach the server.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}
