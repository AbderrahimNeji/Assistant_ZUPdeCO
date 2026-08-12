import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { BenchmarkJobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { hostname } from 'os';
import * as path from 'path';

import { AppLogger } from '../../common/logger/app-logger';
import { ErrorLogger } from '../../common/logger/error-logger';
import { PrismaService } from '../../prisma/prisma.service';
import { AssistantService } from '../assistant/assistant.service';
import { EmbeddingService } from '../documents/services/embedding.service';
import { BenchmarkResultDto } from './dto/benchmark-result.dto';
import { BenchmarkSummaryDto } from './dto/benchmark-summary.dto';
import { FilterBenchmarkDto } from './dto/filter-benchmark.dto';

interface BenchmarkQuestion {
  question: string;
  expectedAnswer: string;
}

type ChatSource = {
  document?: string;
  page?: number;
  score?: number;
};

export type BenchmarkJobProgress = {
  jobId: string;
  userId: string;
  dataset: string;
  status: 'running' | 'completed' | 'failed';
  current: number;
  total: number;
  currentQuestion: string | null;
  startedAt: number;
  runId: string | null;
  error: string | null;
};

const SUCCESS_THRESHOLD = 0.5;
const HIGH_SIMILARITY_THRESHOLD = 0.8;
const STALE_JOB_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class BenchmarkService implements OnModuleInit {
  private readonly workerId = `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assistantService: AssistantService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async onModuleInit() {
    const cutoff = new Date(Date.now() - STALE_JOB_MS);
    const stale = await this.prisma.benchmarkJob.updateMany({
      where: {
        status: {
          in: [BenchmarkJobStatus.RUNNING, BenchmarkJobStatus.PENDING],
        },
        updatedAt: { lt: cutoff },
      },
      data: {
        status: BenchmarkJobStatus.FAILED,
        error: 'Job abandoned after worker restart or timeout',
        completedAt: new Date(),
        currentQuestion: null,
      },
    });

    if (stale.count > 0) {
      AppLogger.warn('Marked stale benchmark jobs as failed', {
        count: stale.count,
        workerId: this.workerId,
      });
    }

    const pending = await this.prisma.benchmarkJob.findMany({
      where: {
        status: {
          in: [BenchmarkJobStatus.PENDING, BenchmarkJobStatus.RUNNING],
        },
        updatedAt: { gte: cutoff },
      },
      orderBy: { startedAt: 'asc' },
      take: 20,
    });

    for (const job of pending) {
      AppLogger.info('Resuming benchmark job after startup', {
        jobId: job.jobId,
        workerId: this.workerId,
      });
      void this.resumeJob(job.jobId);
    }
  }

  async runBenchmark(
    userId: string,
    dataset: string,
  ): Promise<BenchmarkSummaryDto> {
    const benchmarkStart = performance.now();
    const questions = this.loadDataset(dataset);
    const results = await this.evaluateQuestions(userId, dataset, questions);

    const summary = this.computeSummary(results);
    const benchmarkRun = await this.persistRun(
      userId,
      dataset,
      summary,
      results,
    );

    ErrorLogger.logDuration(
      'BenchmarkService.runBenchmark',
      performance.now() - benchmarkStart,
      {
        userId,
        dataset,
        totalQuestions: summary.totalQuestions,
      },
    );

    return {
      ...summary,
      runId: benchmarkRun.id,
      createdAt: benchmarkRun.createdAt,
      dataset: benchmarkRun.dataset,
    };
  }

  async startBenchmarkJob(userId: string, dataset: string) {
    const questions = this.loadDataset(dataset);
    const jobId = randomUUID();

    await this.prisma.benchmarkJob.create({
      data: {
        jobId,
        userId,
        dataset,
        status: BenchmarkJobStatus.PENDING,
        current: 0,
        total: questions.length,
        currentQuestion: null,
        workerId: this.workerId,
      },
    });

    void this.executeBenchmarkJob(jobId, userId, dataset, questions);

    return {
      jobId,
      status: 'running' as const,
      dataset,
      totalQuestions: questions.length,
    };
  }

  async getJobProgress(jobId: string, userId: string) {
    const job = await this.prisma.benchmarkJob.findFirst({
      where: { jobId, userId },
    });

    if (!job) {
      throw new NotFoundException(`Benchmark job "${jobId}" not found`);
    }

    const status =
      job.status === BenchmarkJobStatus.COMPLETED
        ? ('completed' as const)
        : job.status === BenchmarkJobStatus.FAILED
          ? ('failed' as const)
          : ('running' as const);

    const percent =
      job.total === 0
        ? 100
        : Math.min(100, Math.round((job.current / job.total) * 100));
    const elapsedMs = Date.now() - job.startedAt.getTime();
    const etaMs =
      status === 'running' && job.current > 0 && job.current < job.total
        ? Math.round((elapsedMs / job.current) * (job.total - job.current))
        : null;

    return {
      jobId: job.jobId,
      dataset: job.dataset,
      status,
      current: job.current,
      total: job.total,
      currentQuestion: job.currentQuestion,
      percent,
      elapsedMs,
      etaMs,
      runId: job.runId,
      error: job.error,
    };
  }

  private async resumeJob(jobId: string) {
    const job = await this.prisma.benchmarkJob.findUnique({
      where: { jobId },
    });
    if (
      !job ||
      job.status === BenchmarkJobStatus.COMPLETED ||
      job.status === BenchmarkJobStatus.FAILED
    ) {
      return;
    }

    try {
      const questions = this.loadDataset(job.dataset);
      await this.executeBenchmarkJob(
        job.jobId,
        job.userId,
        job.dataset,
        questions,
      );
    } catch (error) {
      ErrorLogger.log(error, 'BenchmarkService.resumeJob', { jobId });
      await this.prisma.benchmarkJob.updateMany({
        where: { jobId },
        data: {
          status: BenchmarkJobStatus.FAILED,
          error:
            error instanceof Error ? error.message : 'Failed to resume job',
          completedAt: new Date(),
          currentQuestion: null,
        },
      });
    }
  }

  private async executeBenchmarkJob(
    jobId: string,
    userId: string,
    dataset: string,
    questions: BenchmarkQuestion[],
  ) {
    await this.prisma.benchmarkJob.updateMany({
      where: {
        jobId,
        status: {
          in: [BenchmarkJobStatus.PENDING, BenchmarkJobStatus.RUNNING],
        },
      },
      data: {
        status: BenchmarkJobStatus.RUNNING,
        workerId: this.workerId,
        total: questions.length,
      },
    });

    try {
      let lastPersist = 0;
      const results = await this.evaluateQuestions(
        userId,
        dataset,
        questions,
        async (current, total, question) => {
          const now = Date.now();
          if (now - lastPersist < 400 && current < total) {
            return;
          }
          lastPersist = now;
          await this.prisma.benchmarkJob.updateMany({
            where: { jobId, status: BenchmarkJobStatus.RUNNING },
            data: {
              current,
              total,
              currentQuestion: question,
            },
          });
        },
      );

      const summary = this.computeSummary(results);
      const benchmarkRun = await this.persistRun(
        userId,
        dataset,
        summary,
        results,
      );

      await this.prisma.benchmarkJob.updateMany({
        where: { jobId },
        data: {
          status: BenchmarkJobStatus.COMPLETED,
          current: questions.length,
          total: questions.length,
          currentQuestion: null,
          runId: benchmarkRun.id,
          error: null,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Benchmark job failed';
      ErrorLogger.log(error, 'BenchmarkService.executeBenchmarkJob', {
        userId,
        dataset,
        jobId,
      });

      await this.prisma.benchmarkJob.updateMany({
        where: { jobId },
        data: {
          status: BenchmarkJobStatus.FAILED,
          error: message,
          currentQuestion: null,
          completedAt: new Date(),
        },
      });
    }
  }

  private async evaluateQuestions(
    userId: string,
    dataset: string,
    questions: BenchmarkQuestion[],
    onProgress?: (
      current: number,
      total: number,
      question: string | null,
    ) => void | Promise<void>,
  ): Promise<BenchmarkResultDto[]> {
    const results: BenchmarkResultDto[] = [];

    for (let index = 0; index < questions.length; index += 1) {
      const item = questions[index];
      await onProgress?.(index, questions.length, item.question);

      const start = performance.now();

      try {
        const response = await this.assistantService.chat(
          userId,
          item.question,
        );

        const latencyMs = performance.now() - start;
        const sources = (response.sources ?? []) as ChatSource[];
        const retrievedSources = sources.length;
        const retrievedContext = this.formatRetrievedContext(sources);

        const similarity = await this.computeSimilarity(
          item.expectedAnswer,
          response.answer,
        );
        const success = similarity >= SUCCESS_THRESHOLD;

        results.push({
          question: item.question,
          expectedAnswer: item.expectedAnswer,
          generatedAnswer: response.answer,
          latencyMs,
          similarity,
          success,
          retrievedSources,
          retrievedContext: retrievedContext || undefined,
          failureReason: success
            ? undefined
            : this.buildFailureReason({
                similarity,
                generatedAnswer: response.answer,
                retrievedSources,
              }),
        });
      } catch (error) {
        ErrorLogger.log(error, 'BenchmarkService.evaluateQuestions.question', {
          userId,
          dataset,
          question: item.question,
        });

        const latencyMs = performance.now() - start;
        const message =
          error instanceof Error ? error.message : 'Unexpected evaluation error';

        results.push({
          question: item.question,
          expectedAnswer: item.expectedAnswer,
          generatedAnswer: '',
          latencyMs,
          similarity: 0,
          success: false,
          retrievedSources: 0,
          failureReason: message,
        });
      }
    }

    await onProgress?.(questions.length, questions.length, null);
    return results;
  }

  private async persistRun(
    userId: string,
    dataset: string,
    summary: ReturnType<BenchmarkService['computeSummary']>,
    results: BenchmarkResultDto[],
  ) {
    try {
      return await this.prisma.benchmarkRun.create({
        data: {
          userId,
          dataset,
          totalQuestions: summary.totalQuestions,
          successCount: summary.successCount,
          failedCount: summary.failedRequests,
          averageLatency: summary.averageLatency,
          averageScore: summary.averageSimilarity,
          results: {
            create: results.map((result) => ({
              question: result.question,
              expectedAnswer: result.expectedAnswer,
              generatedAnswer: result.generatedAnswer,
              latencyMs: result.latencyMs,
              similarity: result.similarity,
              success: result.success,
              retrievedSources: result.retrievedSources,
              failureReason: result.failureReason,
              retrievedContext: result.retrievedContext,
            })),
          },
        },
      });
    } catch (error) {
      ErrorLogger.log(error, 'BenchmarkService.persistRun', { dataset, userId });
      throw error;
    }
  }

  async findAllResults(
    userId: string,
    filters: FilterBenchmarkDto = {},
  ): Promise<BenchmarkSummaryDto[]> {
    const where: {
      userId: string;
      dataset?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (filters.dataset) {
      where.dataset = filters.dataset;
    }

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) {
        where.createdAt.gte = new Date(filters.from);
      }
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const runs = await this.prisma.benchmarkRun.findMany({
      where,
      include: {
        results: {
          select: {
            question: true,
            expectedAnswer: true,
            generatedAnswer: true,
            latencyMs: true,
            similarity: true,
            success: true,
            retrievedSources: true,
            failureReason: true,
            // Omit retrievedContext on list queries for payload size.
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(filters.limit ? { take: filters.limit } : { take: 200 }),
    });

    let summaries = runs.map((run) => this.mapRunToSummary(run));

    if (filters.status === 'success') {
      summaries = summaries.filter((run) => run.successRate === 1);
    } else if (filters.status === 'failures') {
      summaries = summaries.filter((run) => run.failedRequests > 0);
    }

    return summaries;
  }

  async findOne(id: string, userId: string): Promise<BenchmarkSummaryDto> {
    const benchmarkRun = await this.prisma.benchmarkRun.findFirst({
      where: { id, userId },
      include: {
        results: true,
      },
    });

    if (!benchmarkRun) {
      throw new NotFoundException(`Benchmark run "${id}" not found`);
    }

    return this.mapRunToSummary(benchmarkRun);
  }

  async getDashboardHistory(
    userId: string,
    filters: FilterBenchmarkDto = {},
  ) {
    const summaries = await this.findAllResults(userId, filters);
    const chronological = [...summaries].reverse();

    return {
      runs: chronological.map((summary) => ({
        id: summary.runId,
        createdAt: summary.createdAt,
        dataset: summary.dataset,
        totalQuestions: summary.totalQuestions,
        successCount: summary.successCount,
        failedRequests: summary.failedRequests,
        successRate: summary.successRate,
        averageLatency: summary.averageLatency,
        minLatency: summary.minLatency,
        maxLatency: summary.maxLatency,
        medianLatency: summary.medianLatency,
        averageSimilarity: summary.averageSimilarity,
        highSimilarityRate: summary.highSimilarityRate,
        averageRetrievedSources: summary.averageRetrievedSources,
      })),
    };
  }

  async exportRun(
    id: string,
    userId: string,
    format: 'json' | 'csv' | 'pdf',
  ): Promise<{
    contentType: string;
    filename: string;
    body: string | Buffer;
  }> {
    const summary = await this.findOne(id, userId);
    const stamp = new Date(summary.createdAt ?? Date.now())
      .toISOString()
      .slice(0, 10);
    const base = `benchmark-${summary.dataset ?? 'run'}-${stamp}-${id.slice(0, 8)}`;

    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: `${base}.json`,
        body: JSON.stringify(summary, null, 2),
      };
    }

    if (format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${base}.csv`,
        body: this.toCsv(summary),
      };
    }

    return {
      contentType: 'application/pdf',
      filename: `${base}.pdf`,
      body: this.toPdf(summary),
    };
  }

  listDatasets(): string[] {
    const datasetsDir = path.join(__dirname, 'datasets');
    if (!fs.existsSync(datasetsDir)) {
      return [];
    }

    return fs
      .readdirSync(datasetsDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));
  }

  private formatRetrievedContext(sources: ChatSource[]): string {
    return sources
      .map((source) => {
        const document = source.document?.trim() || 'Unknown document';
        const page =
          typeof source.page === 'number' ? `p.${source.page}` : 'p.?';
        const score =
          typeof source.score === 'number'
            ? `score ${source.score.toFixed(3)}`
            : null;
        return score
          ? `${document} (${page}, ${score})`
          : `${document} (${page})`;
      })
      .join('; ');
  }

  private buildFailureReason(input: {
    similarity: number;
    generatedAnswer: string;
    retrievedSources: number;
  }): string {
    if (!input.generatedAnswer.trim()) {
      return 'No answer was generated for this question.';
    }
    if (input.retrievedSources === 0) {
      return `Similarity ${input.similarity.toFixed(3)} below threshold (${SUCCESS_THRESHOLD}); no sources retrieved.`;
    }
    return `Similarity ${input.similarity.toFixed(3)} below threshold (${SUCCESS_THRESHOLD}).`;
  }

  private toCsv(summary: BenchmarkSummaryDto): string {
    const escape = (value: unknown) => {
      const text = String(value ?? '');
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = [
      'question',
      'expectedAnswer',
      'generatedAnswer',
      'similarity',
      'latencyMs',
      'success',
      'retrievedSources',
      'failureReason',
      'retrievedContext',
    ];

    const rows = summary.results.map((result) =>
      [
        result.question,
        result.expectedAnswer ?? '',
        result.generatedAnswer,
        result.similarity ?? '',
        result.latencyMs,
        result.success,
        result.retrievedSources,
        result.failureReason ?? '',
        result.retrievedContext ?? '',
      ]
        .map(escape)
        .join(','),
    );

    const meta = [
      `# runId=${summary.runId}`,
      `# dataset=${summary.dataset}`,
      `# createdAt=${summary.createdAt?.toISOString?.() ?? summary.createdAt}`,
      `# successRate=${summary.successRate}`,
      `# averageSimilarity=${summary.averageSimilarity}`,
      `# averageLatencyMs=${summary.averageLatency}`,
      `# highSimilarityRate=${summary.highSimilarityRate}`,
      `# totalQuestions=${summary.totalQuestions}`,
      `# failedRequests=${summary.failedRequests}`,
    ];

    return [...meta, header.join(','), ...rows].join('\n');
  }

  private toPdf(summary: BenchmarkSummaryDto): Buffer {
    const lines = [
      'Benchmark Report',
      `Run: ${summary.runId}`,
      `Dataset: ${summary.dataset ?? 'unknown'}`,
      `Date: ${summary.createdAt ?? ''}`,
      `Questions: ${summary.totalQuestions}`,
      `Success rate: ${(summary.successRate * 100).toFixed(1)}%`,
      `Avg similarity: ${(summary.averageSimilarity ?? 0).toFixed(3)}`,
      `Avg latency: ${(summary.averageLatency / 1000).toFixed(2)} s`,
      '',
      'Results:',
      ...summary.results.map((result, index) => {
        const sim = (result.similarity ?? 0).toFixed(2);
        const latency = (result.latencyMs / 1000).toFixed(1);
        const status = result.success ? 'OK' : 'FAIL';
        const question = result.question.replace(/\s+/g, ' ').slice(0, 70);
        return `${index + 1}. [${status}] sim=${sim} lat=${latency}s | ${question}`;
      }),
    ];

    const contentLines = lines
      .map((line, index) => {
        const escaped = line
          .replace(/\\/g, '\\\\')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)');
        const y = 800 - index * 14;
        return `BT /F1 10 Tf 40 ${y} Td (${escaped}) Tj ET`;
      })
      .join('\n');

    const objects = [
      '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
      '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
      '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj',
      `4 0 obj<< /Length ${Buffer.byteLength(contentLines, 'utf8')} >>stream\n${contentLines}\nendstream\nendobj`,
      '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private mapRunToSummary(run: {
    id: string;
    createdAt: Date;
    dataset?: string;
    results: {
      question: string;
      expectedAnswer: string | null;
      generatedAnswer: string;
      latencyMs: number;
      similarity: number | null;
      success: boolean;
      retrievedSources: number;
      failureReason?: string | null;
      retrievedContext?: string | null;
    }[];
  }): BenchmarkSummaryDto {
    const results: BenchmarkResultDto[] = run.results.map((result) => ({
      question: result.question,
      expectedAnswer: result.expectedAnswer ?? undefined,
      generatedAnswer: result.generatedAnswer,
      latencyMs: result.latencyMs,
      similarity: result.similarity ?? undefined,
      success: result.success,
      retrievedSources: result.retrievedSources,
      failureReason: result.failureReason ?? undefined,
      retrievedContext: result.retrievedContext ?? undefined,
    }));

    return {
      ...this.computeSummary(results),
      runId: run.id,
      createdAt: run.createdAt,
      dataset: run.dataset ?? 'unknown',
    };
  }

  private computeSummary(
    results: BenchmarkResultDto[],
  ): BenchmarkSummaryDto {
    const totalQuestions = results.length;
    const successCount = results.filter((r) => r.success).length;
    const failedRequests = totalQuestions - successCount;

    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const totalLatency = latencies.reduce((sum, value) => sum + value, 0);
    const totalSimilarity = results.reduce(
      (sum, result) => sum + (result.similarity ?? 0),
      0,
    );
    const retrievedSources = results.reduce(
      (sum, result) => sum + result.retrievedSources,
      0,
    );
    const highSimilarityCount = results.filter(
      (result) => (result.similarity ?? 0) >= HIGH_SIMILARITY_THRESHOLD,
    ).length;

    return {
      totalQuestions,
      successCount,
      failedRequests,
      successRate:
        totalQuestions === 0 ? 0 : successCount / totalQuestions,
      averageLatency:
        totalQuestions === 0 ? 0 : totalLatency / totalQuestions,
      minLatency: totalQuestions === 0 ? 0 : latencies[0],
      maxLatency:
        totalQuestions === 0 ? 0 : latencies[latencies.length - 1],
      medianLatency: this.median(latencies),
      averageSimilarity:
        totalQuestions === 0 ? 0 : totalSimilarity / totalQuestions,
      highSimilarityRate:
        totalQuestions === 0
          ? 0
          : highSimilarityCount / totalQuestions,
      retrievedSources,
      averageRetrievedSources:
        totalQuestions === 0 ? 0 : retrievedSources / totalQuestions,
      results,
    };
  }

  private median(sortedValues: number[]): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const middle = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 0) {
      return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
    }

    return sortedValues[middle];
  }

  private loadDataset(dataset: string): BenchmarkQuestion[] {
    if (!/^[a-zA-Z0-9_-]+$/.test(dataset)) {
      throw new NotFoundException(`Dataset "${dataset}" not found`);
    }

    const datasetsDir = path.join(__dirname, 'datasets');
    const datasetPath = path.resolve(datasetsDir, `${dataset}.json`);

    if (
      !datasetPath.startsWith(datasetsDir + path.sep) ||
      !fs.existsSync(datasetPath)
    ) {
      throw new NotFoundException(`Dataset "${dataset}" not found`);
    }

    return JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  }

  private async computeSimilarity(
    expectedAnswer: string,
    generatedAnswer: string,
  ): Promise<number> {
    if (!expectedAnswer?.trim() || !generatedAnswer?.trim()) {
      return 0;
    }

    const start = performance.now();

    try {
      const [expectedEmbedding, generatedEmbedding] = await Promise.all([
        this.embeddingService.embed(expectedAnswer),
        this.embeddingService.embed(generatedAnswer),
      ]);

      ErrorLogger.logDuration(
        'BenchmarkService.computeSimilarity',
        performance.now() - start,
      );

      return this.cosineSimilarity(expectedEmbedding, generatedEmbedding);
    } catch (error) {
      ErrorLogger.log(error, 'BenchmarkService.computeSimilarity');
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    const score = dot / denominator;
    return Math.min(1, Math.max(0, score));
  }
}
