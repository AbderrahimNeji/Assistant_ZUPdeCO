"use client";

import { useQuery } from "@tanstack/react-query";

import { BenchmarkApi } from "@/features/benchmark/services/benchmark.api";
import type { BenchmarkListFilters } from "@/features/benchmark/types";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useBenchmarkHistory(filters: BenchmarkListFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BENCHMARK.HISTORY, filters] as const,
    queryFn: () => BenchmarkApi.getHistory(filters),
  });
}
