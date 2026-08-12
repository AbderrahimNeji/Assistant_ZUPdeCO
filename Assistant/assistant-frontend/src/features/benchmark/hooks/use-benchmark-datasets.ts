"use client";

import { useQuery } from "@tanstack/react-query";

import { BenchmarkApi } from "@/features/benchmark/services/benchmark.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useBenchmarkDatasets() {
  return useQuery({
    queryKey: QUERY_KEYS.BENCHMARK.DATASETS,
    queryFn: () => BenchmarkApi.listDatasets(),
  });
}
