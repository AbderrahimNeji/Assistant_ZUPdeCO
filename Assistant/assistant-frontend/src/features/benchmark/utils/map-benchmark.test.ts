import { describe, expect, it } from "vitest";

import { mapBenchmarkRun } from "@/features/benchmark/utils/map-benchmark";

describe("mapBenchmarkRun", () => {
  it("maps API summaries into UI run models", () => {
    const run = mapBenchmarkRun({
      runId: "run-1",
      createdAt: "2026-07-23T10:00:00.000Z",
      dataset: "benchmark",
      totalQuestions: 2,
      successCount: 1,
      failedRequests: 1,
      successRate: 0.5,
      averageLatency: 100,
      minLatency: 50,
      maxLatency: 150,
      medianLatency: 100,
      results: [
        {
          question: "Q1",
          generatedAnswer: "A1",
          latencyMs: 50,
          success: true,
          retrievedSources: 1,
        },
        {
          question: "Q2",
          generatedAnswer: "A2",
          latencyMs: 150,
          success: false,
          retrievedSources: 0,
          failureReason: "low similarity",
        },
      ],
    });

    expect(run.runId).toBe("run-1");
    expect(run.status).toBe("failed");
    expect(run.results).toHaveLength(2);
  });
});
