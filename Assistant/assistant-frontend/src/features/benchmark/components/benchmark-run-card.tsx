"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BenchmarkRun } from "@/features/benchmark/types";
import {
  formatDateTime,
  formatLatency,
  formatPercent,
  formatScore,
} from "@/features/benchmark/utils/map-benchmark";
import { cn } from "@/lib/utils";

type BenchmarkRunCardProps = {
  run: BenchmarkRun;
  onOpen: (run: BenchmarkRun) => void;
  selectedForCompare?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (run: BenchmarkRun) => void;
  className?: string;
};

function statusVariant(
  status: BenchmarkRun["status"],
): "outline" | "secondary" | "destructive" {
  if (status === "passed") return "outline";
  if (status === "failed") return "destructive";
  return "secondary";
}

function statusLabel(status: BenchmarkRun["status"]) {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Completed with failures";
  return "Completed";
}

export function BenchmarkRunCard({
  run,
  onOpen,
  selectedForCompare = false,
  compareDisabled = false,
  onToggleCompare,
  className,
}: BenchmarkRunCardProps) {
  return (
    <Card
      className={cn(
        "ednov-transition",
        selectedForCompare && "ring-2 ring-brand-orange/50",
        className,
      )}
    >
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="truncate text-base text-brand-orange">
            {run.name}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <time dateTime={run.createdAt}>{formatDateTime(run.createdAt)}</time>
            <span aria-hidden>·</span>
            <span>{run.dataset}</span>
            <span aria-hidden>·</span>
            <span>{run.totalQuestions} questions</span>
          </CardDescription>
        </div>
        <Badge
          variant={statusVariant(run.status)}
          className={cn(
            run.status === "passed" &&
              "border-brand-teal/35 bg-brand-mint text-brand-teal",
          )}
        >
          {statusLabel(run.status)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Overall score</dt>
            <dd className="font-display font-semibold">
              {formatScore(run.averageSimilarity)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Success rate</dt>
            <dd className="font-display font-semibold">
              {formatPercent(run.successRate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Avg latency</dt>
            <dd className="font-display font-semibold">
              {formatLatency(run.averageLatency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Duration</dt>
            <dd className="font-display font-semibold">
              {formatLatency(run.totalDurationMs)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {run.failedRequests} failed · {run.successCount} passed
          </p>
          <div className="flex flex-wrap gap-2">
            {onToggleCompare ? (
              <Button
                type="button"
                variant={selectedForCompare ? "brand" : "outline"}
                size="sm"
                disabled={compareDisabled && !selectedForCompare}
                onClick={() => onToggleCompare(run)}
                aria-pressed={selectedForCompare}
              >
                {selectedForCompare ? "Selected" : "Compare"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpen(run)}
              aria-label={`View details for ${run.name}`}
            >
              View details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
