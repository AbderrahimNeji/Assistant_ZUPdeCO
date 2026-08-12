"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BenchmarkApi } from "@/features/benchmark/services/benchmark.api";
import type { BenchmarkJobProgress } from "@/features/benchmark/types";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useRunBenchmark() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<string | null>(null);

  const progressQuery = useQuery({
    queryKey: ["benchmark", "job", jobId] as const,
    queryFn: () => BenchmarkApi.getJobProgress(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return false;
      }
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 1500;
    },
  });

  const startMutation = useMutation({
    mutationFn: (dataset: string) => BenchmarkApi.startAsync(dataset),
    onSuccess: (started) => {
      setActiveDataset(started.dataset);
      setJobId(started.jobId);
    },
  });

  useEffect(() => {
    const progress = progressQuery.data;
    if (!progress) return;
    if (progress.status !== "completed" && progress.status !== "failed") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.BENCHMARK.RUNS,
    });
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.BENCHMARK.HISTORY,
    });
    if (progress.runId) {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BENCHMARK.DETAIL(progress.runId),
      });
    }
  }, [progressQuery.data, queryClient]);

  const reset = useCallback(() => {
    setJobId(null);
    setActiveDataset(null);
  }, []);

  const progress: BenchmarkJobProgress | null = progressQuery.data ?? null;
  const isRunning =
    startMutation.isPending ||
    (Boolean(jobId) &&
      progress?.status !== "completed" &&
      progress?.status !== "failed");

  return {
    start: startMutation.mutate,
    startAsync: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isRunning,
    progress,
    activeDataset,
    startError: startMutation.error,
    progressError: progressQuery.error,
    reset,
  };
}
