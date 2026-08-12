"use client";

import { useQuery } from "@tanstack/react-query";

import { BenchmarkApi } from "@/features/benchmark/services/benchmark.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useBenchmark(runId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.BENCHMARK.DETAIL(runId ?? "none"),
    queryFn: () => BenchmarkApi.getById(runId!),
    enabled: Boolean(runId),
  });
}
