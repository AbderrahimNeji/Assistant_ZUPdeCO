"use client";

import { useQuery } from "@tanstack/react-query";

import { BenchmarkApi } from "@/features/benchmark/services/benchmark.api";
import type { BenchmarkListFilters } from "@/features/benchmark/types";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useBenchmarks(filters: BenchmarkListFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BENCHMARK.RUNS, filters] as const,
    queryFn: () =>
      BenchmarkApi.listResults({
        limit: 100,
        ...filters,
      }),
  });
}
