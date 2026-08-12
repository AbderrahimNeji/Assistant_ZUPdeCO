import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";
import type {
  BenchmarkAsyncStart,
  BenchmarkHistoryResponse,
  BenchmarkJobProgress,
  BenchmarkListFilters,
  BenchmarkRun,
} from "@/features/benchmark/types";
import {
  mapBenchmarkRun,
  mapBenchmarkRuns,
} from "@/features/benchmark/utils/map-benchmark";

function toParams(filters?: BenchmarkListFilters) {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.dataset) params.dataset = filters.dataset;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.limit != null) {
    params.limit = String(filters.limit);
  }
  return Object.keys(params).length ? params : undefined;
}

export const BenchmarkApi = {
  async listResults(filters?: BenchmarkListFilters): Promise<BenchmarkRun[]> {
    const response = await apiClient.get(API_ROUTES.BENCHMARK.RESULTS, {
      params: toParams(filters),
    });
    const payload = response.data;
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
    return mapBenchmarkRuns(rows);
  },

  async getById(runId: string): Promise<BenchmarkRun> {
    const response = await apiClient.get(API_ROUTES.BENCHMARK.DETAIL(runId));
    return mapBenchmarkRun(response.data);
  },

  async listDatasets(): Promise<string[]> {
    const response = await apiClient.get<{ datasets?: string[] }>(
      API_ROUTES.BENCHMARK.DATASETS,
    );
    return response.data?.datasets ?? [];
  },

  async getHistory(
    filters?: BenchmarkListFilters,
  ): Promise<BenchmarkHistoryResponse> {
    const response = await apiClient.get<BenchmarkHistoryResponse>(
      API_ROUTES.BENCHMARK.HISTORY,
      { params: toParams(filters) },
    );
    return {
      runs: Array.isArray(response.data?.runs) ? response.data.runs : [],
    };
  },

  async run(dataset: string): Promise<BenchmarkRun> {
    const response = await apiClient.post(API_ROUTES.BENCHMARK.RUN, {
      dataset,
    });
    return mapBenchmarkRun(response.data);
  },

  async startAsync(dataset: string): Promise<BenchmarkAsyncStart> {
    const response = await apiClient.post<BenchmarkAsyncStart>(
      API_ROUTES.BENCHMARK.RUN_ASYNC,
      { dataset },
    );
    return response.data;
  },

  async getJobProgress(jobId: string): Promise<BenchmarkJobProgress> {
    const response = await apiClient.get<BenchmarkJobProgress>(
      API_ROUTES.BENCHMARK.JOB_PROGRESS(jobId),
    );
    return response.data;
  },

  async exportRun(
    runId: string,
    format: "json" | "csv",
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.get(
      API_ROUTES.BENCHMARK.EXPORT(runId, format),
      { responseType: "blob" },
    );

    const disposition = String(
      response.headers["content-disposition"] ?? "",
    );
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename =
      match?.[1] ??
      `benchmark-${runId.slice(0, 8)}.${format === "csv" ? "csv" : "json"}`;

    return { blob: response.data as Blob, filename };
  },
};
