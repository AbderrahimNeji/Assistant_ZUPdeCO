"use client";

import type { BenchmarkListFilters } from "@/features/benchmark/types";
import { cn } from "@/lib/utils";

type BenchmarkFiltersBarProps = {
  datasets: string[];
  filters: BenchmarkListFilters;
  searchQuery: string;
  onFiltersChange: (filters: BenchmarkListFilters) => void;
  onSearchChange: (value: string) => void;
  className?: string;
};

export function BenchmarkFiltersBar({
  datasets,
  filters,
  searchQuery,
  onFiltersChange,
  onSearchChange,
  className,
}: BenchmarkFiltersBarProps) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card md:grid-cols-2 xl:grid-cols-5",
        className,
      )}
    >
      <label className="space-y-1.5 text-xs font-semibold text-muted-foreground xl:col-span-2">
        Search
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Dataset, run name, or model…"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>

      <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
        Dataset
        <select
          value={filters.dataset ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              dataset: event.target.value || undefined,
            })
          }
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="">All datasets</option>
          {datasets.map((dataset) => (
            <option key={dataset} value={dataset}>
              {dataset}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
        Status
        <select
          value={filters.status ?? "all"}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as BenchmarkListFilters["status"],
            })
          }
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="all">All statuses</option>
          <option value="success">Passed</option>
          <option value="failures">With failures</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3 xl:col-span-1 md:col-span-2 xl:col-auto">
        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
          From
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                from: event.target.value || undefined,
              })
            }
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
          To
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                to: event.target.value || undefined,
              })
            }
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground md:col-span-2 xl:col-span-5">
        Model filtering is unavailable until runs report a model identifier.
        Search still matches model text when present.
      </p>
    </div>
  );
}
