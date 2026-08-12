export type BenchmarkResultItem = {
  question: string;
  expectedAnswer?: string;
  generatedAnswer: string;
  latencyMs: number;
  similarity?: number;
  success: boolean;
  retrievedSources: number;
  failureReason?: string;
  retrievedContext?: string;
};

export type BenchmarkRun = {
  runId: string;
  createdAt: string;
  dataset: string;
  name: string;
  /** Optional model identifier when the backend provides one. */
  model?: string | null;
  status: "passed" | "failed" | "completed";
  totalQuestions: number;
  successCount: number;
  failedRequests: number;
  successRate: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  medianLatency: number;
  averageSimilarity?: number;
  highSimilarityRate: number;
  retrievedSources: number;
  averageRetrievedSources: number;
  /** Sum of per-question latencies when results are present. */
  totalDurationMs?: number;
  /** Precision/recall/tokens are not computed by the backend today. */
  precision?: number | null;
  recall?: number | null;
  tokenUsage?: number | null;
  results: BenchmarkResultItem[];
};

export type BenchmarkHistoryPoint = {
  id?: string;
  createdAt?: string;
  dataset?: string;
  totalQuestions?: number;
  successCount?: number;
  failedRequests?: number;
  successRate?: number;
  averageLatency?: number;
  minLatency?: number;
  maxLatency?: number;
  medianLatency?: number;
  averageSimilarity?: number;
  highSimilarityRate?: number;
  averageRetrievedSources?: number;
};

export type BenchmarkHistoryResponse = {
  runs: BenchmarkHistoryPoint[];
};

export type BenchmarkListFilters = {
  dataset?: string;
  from?: string;
  to?: string;
  status?: "all" | "success" | "failures";
  limit?: number;
};

export type BenchmarkJobProgress = {
  jobId: string;
  dataset: string;
  status: "running" | "completed" | "failed";
  current: number;
  total: number;
  currentQuestion: string | null;
  percent: number;
  elapsedMs: number;
  etaMs: number | null;
  runId: string | null;
  error: string | null;
};

export type BenchmarkAsyncStart = {
  jobId: string;
  status: "running";
  dataset: string;
  totalQuestions: number;
};
