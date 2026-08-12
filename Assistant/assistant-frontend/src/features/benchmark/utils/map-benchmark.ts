import type {
  BenchmarkResultItem,
  BenchmarkRun,
} from "@/features/benchmark/types";

type BenchmarkResultApiModel = {
  question?: string;
  expectedAnswer?: string;
  generatedAnswer?: string;
  latencyMs?: number;
  similarity?: number;
  success?: boolean;
  retrievedSources?: number;
  failureReason?: string | null;
  retrievedContext?: string | null;
};

type BenchmarkSummaryApiModel = {
  runId?: string;
  id?: string;
  createdAt?: string | Date;
  dataset?: string;
  model?: string | null;
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
  retrievedSources?: number;
  averageRetrievedSources?: number;
  precision?: number | null;
  recall?: number | null;
  tokenUsage?: number | null;
  results?: BenchmarkResultApiModel[];
};

function mapResult(raw: BenchmarkResultApiModel): BenchmarkResultItem {
  return {
    question: raw.question ?? "",
    expectedAnswer: raw.expectedAnswer,
    generatedAnswer: raw.generatedAnswer ?? "",
    latencyMs: Number(raw.latencyMs ?? 0),
    similarity:
      typeof raw.similarity === "number" ? raw.similarity : undefined,
    success: Boolean(raw.success),
    retrievedSources: Number(raw.retrievedSources ?? 0),
    failureReason: raw.failureReason ?? undefined,
    retrievedContext: raw.retrievedContext ?? undefined,
  };
}

function deriveStatus(
  successRate: number,
  failedRequests: number,
): BenchmarkRun["status"] {
  if (failedRequests === 0 && successRate >= 1) return "passed";
  if (failedRequests > 0) return "failed";
  return "completed";
}

export function mapBenchmarkRun(raw: BenchmarkSummaryApiModel): BenchmarkRun {
  const results = (raw.results ?? []).map(mapResult);
  const runId = raw.runId ?? raw.id ?? "";
  const dataset = raw.dataset?.trim() || "unknown";
  const successRate = Number(raw.successRate ?? 0);
  const failedRequests = Number(raw.failedRequests ?? 0);
  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : new Date().toISOString();

  const totalDurationMs =
    results.length > 0
      ? results.reduce((sum, result) => sum + result.latencyMs, 0)
      : undefined;

  return {
    runId,
    createdAt,
    dataset,
    name: `Benchmark · ${dataset}`,
    model: raw.model ?? null,
    status: deriveStatus(successRate, failedRequests),
    totalQuestions: Number(raw.totalQuestions ?? results.length),
    successCount: Number(raw.successCount ?? 0),
    failedRequests,
    successRate,
    averageLatency: Number(raw.averageLatency ?? 0),
    minLatency: Number(raw.minLatency ?? 0),
    maxLatency: Number(raw.maxLatency ?? 0),
    medianLatency: Number(raw.medianLatency ?? 0),
    averageSimilarity:
      typeof raw.averageSimilarity === "number"
        ? raw.averageSimilarity
        : undefined,
    highSimilarityRate: Number(raw.highSimilarityRate ?? 0),
    retrievedSources: Number(raw.retrievedSources ?? 0),
    averageRetrievedSources: Number(raw.averageRetrievedSources ?? 0),
    totalDurationMs,
    precision:
      typeof raw.precision === "number" ? raw.precision : null,
    recall: typeof raw.recall === "number" ? raw.recall : null,
    tokenUsage:
      typeof raw.tokenUsage === "number" ? raw.tokenUsage : null,
    results,
  };
}

export function mapBenchmarkRuns(
  raw: BenchmarkSummaryApiModel[] | undefined,
): BenchmarkRun[] {
  if (!raw?.length) return [];
  return raw.map(mapBenchmarkRun);
}

export function formatPercent(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatScore(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(3);
}

export function formatLatency(ms: number | undefined | null): string {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatEta(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return "<1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `~${minutes}m ${rem}s`;
}

export function deltaClass(delta: number | null): string {
  if (delta === null || Math.abs(delta) < 1e-9) return "text-muted-foreground";
  return delta > 0 ? "text-emerald-700" : "text-destructive";
}

export function metricDelta(
  next: number | null | undefined,
  prev: number | null | undefined,
  higherIsBetter = true,
): number | null {
  if (typeof next !== "number" || typeof prev !== "number") return null;
  const delta = next - prev;
  return higherIsBetter ? delta : -delta;
}
