"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  Loader2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BenchmarkApi } from "@/features/benchmark/services/benchmark.api";
import type { BenchmarkResultItem, BenchmarkRun } from "@/features/benchmark/types";
import {
  formatDateTime,
  formatLatency,
  formatPercent,
  formatScore,
} from "@/features/benchmark/utils/map-benchmark";
import { useModalA11y } from "@/features/shared/hooks/use-modal-a11y";
import { toast } from "@/features/shared/store/toast.store";
import { cn } from "@/lib/utils";

type BenchmarkDetailsPanelProps = {
  open: boolean;
  run: BenchmarkRun | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onClose: () => void;
};

export function BenchmarkDetailsPanel({
  open,
  run,
  isLoading = false,
  isError = false,
  onRetry,
  onClose,
}: BenchmarkDetailsPanelProps) {
  const panelRef = useModalA11y({ open, onClose });
  const [expandedFailed, setExpandedFailed] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState<"json" | "csv" | null>(null);
  const [resultFilter, setResultFilter] = useState<"all" | "failed">("all");

  const failedResults = useMemo(
    () =>
      (run?.results ?? [])
        .map((result, index) => ({ result, index }))
        .filter((item) => !item.result.success),
    [run],
  );

  const visibleResults = useMemo(() => {
    if (!run) return [];
    if (resultFilter === "failed") {
      return failedResults;
    }
    return run.results.map((result, index) => ({ result, index }));
  }, [run, resultFilter, failedResults]);

  if (!open) return null;

  function toggleExpanded(index: number) {
    setExpandedFailed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleExport(format: "json" | "csv") {
    if (!run?.runId) return;
    setIsExporting(format);
    try {
      const { blob, filename } = await BenchmarkApi.exportRun(run.runId, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Export ready",
        description: `Downloaded ${filename}`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Couldn’t download this benchmark export.",
        variant: "error",
      });
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-brand-navy/40 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="benchmark-details-title"
        tabIndex={-1}
        className="flex h-full w-full max-w-3xl flex-col bg-background shadow-card outline-none transition-transform duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4 md:px-6">
          <div className="min-w-0 space-y-1">
            <h2
              id="benchmark-details-title"
              className="font-display text-lg font-bold tracking-tight"
            >
              {run?.name ?? "Benchmark details"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {run ? formatDateTime(run.createdAt) : "Loading run metrics…"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close benchmark details"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {isLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading details">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : null}

          {isError ? (
            <div role="alert" className="space-y-3 py-10 text-center">
              <p className="text-sm text-destructive">
                Couldn’t load this benchmark run.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : null}

          {!isLoading && !isError && run ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{run.dataset}</Badge>
                  <Badge
                    variant={
                      run.status === "failed" ? "destructive" : "secondary"
                    }
                    className={cn(
                      run.status === "passed" &&
                        "border-brand-mint/80 bg-brand-mint/40 text-brand-navy",
                    )}
                  >
                    {run.status === "passed"
                      ? "Passed"
                      : run.status === "failed"
                        ? "Completed with failures"
                        : "Completed"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isExporting !== null}
                    onClick={() => void handleExport("json")}
                  >
                    {isExporting === "json" ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Download className="size-3.5" aria-hidden />
                    )}
                    JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isExporting !== null}
                    onClick={() => void handleExport("csv")}
                  >
                    {isExporting === "csv" ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Download className="size-3.5" aria-hidden />
                    )}
                    CSV
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Success rate"
                  value={formatPercent(run.successRate)}
                />
                <MetricCard
                  label="Overall score"
                  value={formatScore(run.averageSimilarity)}
                />
                <MetricCard
                  label="High similarity rate"
                  value={formatPercent(run.highSimilarityRate)}
                />
                <MetricCard
                  label="Avg latency"
                  value={formatLatency(run.averageLatency)}
                />
                <MetricCard
                  label="Median latency"
                  value={formatLatency(run.medianLatency)}
                />
                <MetricCard
                  label="Latency range"
                  value={`${formatLatency(run.minLatency)} – ${formatLatency(run.maxLatency)}`}
                />
                <MetricCard
                  label="Questions"
                  value={`${run.successCount}/${run.totalQuestions} succeeded`}
                />
                <MetricCard
                  label="Retrieved sources"
                  value={`${run.retrievedSources} total · avg ${run.averageRetrievedSources.toFixed(2)}`}
                />
                {typeof run.totalDurationMs === "number" ? (
                  <MetricCard
                    label="Total duration"
                    value={formatLatency(run.totalDurationMs)}
                  />
                ) : null}
                <MetricCard
                  label="Precision / Recall / Tokens"
                  value="Not available"
                />
              </div>

              <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Per-question results
                    </CardTitle>
                    <CardDescription>
                      Expand failed rows for expected answer, context, and reason
                    </CardDescription>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={resultFilter === "all" ? "brand" : "outline"}
                      onClick={() => setResultFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={resultFilter === "failed" ? "brand" : "outline"}
                      onClick={() => setResultFilter("failed")}
                    >
                      Failed ({failedResults.length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto px-0 pb-0">
                  {visibleResults.length === 0 ? (
                    <div
                      role="status"
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {resultFilter === "failed"
                        ? "No failed questions in this run."
                        : "No question results available."}
                    </div>
                  ) : (
                    <table className="w-full min-w-[44rem] text-left text-sm">
                      <thead className="border-y border-border/70 bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Question</th>
                          <th className="px-4 py-2 font-semibold">Success</th>
                          <th className="px-4 py-2 font-semibold">Score</th>
                          <th className="px-4 py-2 font-semibold">Latency</th>
                          <th className="px-4 py-2 font-semibold">Sources</th>
                          <th className="px-4 py-2 font-semibold">
                            <span className="sr-only">Expand</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleResults.map(({ result, index }) => {
                          const isFailed = !result.success;
                          const isExpanded = expandedFailed.has(index);

                          return (
                            <ResultRow
                              key={`${run.runId}-${index}`}
                              result={result}
                              isFailed={isFailed}
                              isExpanded={isExpanded}
                              onToggle={() => toggleExpanded(index)}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function ResultRow({
  result,
  isFailed,
  isExpanded,
  onToggle,
}: {
  result: BenchmarkResultItem;
  isFailed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-border/60 align-top">
        <td className="max-w-sm px-4 py-3">
          <p className="line-clamp-3 font-medium text-foreground">
            {result.question}
          </p>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "font-medium",
              result.success ? "text-brand-navy" : "text-destructive",
            )}
          >
            {result.success ? "Yes" : "No"}
          </span>
        </td>
        <td className="px-4 py-3">{formatScore(result.similarity)}</td>
        <td className="px-4 py-3">{formatLatency(result.latencyMs)}</td>
        <td className="px-4 py-3">{result.retrievedSources}</td>
        <td className="px-4 py-3">
          {isFailed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded ? "Collapse failed question" : "Inspect failed question"
              }
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )}
                aria-hidden
              />
            </Button>
          ) : null}
        </td>
      </tr>
      {isFailed && isExpanded ? (
        <tr className="border-b border-border/60 bg-destructive/5">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <DetailBlock label="Question" value={result.question} />
              <DetailBlock
                label="Expected answer"
                value={result.expectedAnswer?.trim() || "—"}
              />
              <DetailBlock
                label="Assistant answer"
                value={result.generatedAnswer.trim() || "—"}
              />
              <DetailBlock
                label="Retrieved context"
                value={
                  result.retrievedContext?.trim() ||
                  (result.retrievedSources > 0
                    ? `${result.retrievedSources} source(s) retrieved (text not stored).`
                    : "No retrieved context available.")
                }
              />
              <DetailBlock
                label="Score"
                value={formatScore(result.similarity)}
              />
              <DetailBlock
                label="Failure reason"
                value={
                  result.failureReason?.trim() ||
                  "Similarity below the success threshold."
                }
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card ednov-transition">
      <p className="ednov-label">{label}</p>
      <p className="mt-1.5 font-display text-xl font-bold tracking-tight text-brand-orange">
        {value}
      </p>
    </div>
  );
}
