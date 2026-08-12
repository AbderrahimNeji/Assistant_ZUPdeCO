import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../../../prisma/prisma.service';

export type QaCaseSeed = {
  id?: string;
  mode?: 'functional' | 'business' | 'hybrid';
  question: string;
  expectedAnswer?: string;
  notes?: string;
};

@Injectable()
export class EvaluationQaService {
  constructor(private readonly prisma: PrismaService) {}

  async listRuns(limit = 20) {
    return this.prisma.evaluationQaRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
      include: {
        _count: { select: { cases: true } },
      },
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.evaluationQaRun.findUnique({
      where: { id },
      include: { cases: { orderBy: { createdAt: 'asc' } } },
    });
    if (!run) throw new NotFoundException('QA run not found');
    return run;
  }

  async createRun(input: {
    name: string;
    dataset?: string;
    mode?: string;
    userId?: string;
    cases: Array<{
      question: string;
      expectedAnswer?: string;
      actualAnswer?: string;
      sources?: unknown;
      scores?: unknown;
      latencyMs?: number;
      passed?: boolean;
      notes?: string;
    }>;
  }) {
    const cases = input.cases ?? [];
    const passed = cases.filter((c) => c.passed === true).length;
    const failed = cases.filter((c) => c.passed === false).length;
    const avgLatency =
      cases.length > 0
        ? cases.reduce((sum, c) => sum + (c.latencyMs ?? 0), 0) / cases.length
        : 0;

    return this.prisma.evaluationQaRun.create({
      data: {
        name: input.name,
        dataset: input.dataset ?? 'default',
        mode: input.mode ?? 'hybrid',
        status: 'completed',
        userId: input.userId,
        summary: {
          total: cases.length,
          passed,
          failed,
          averageLatencyMs: Math.round(avgLatency),
        },
        cases: {
          create: cases.map((c) => ({
            question: c.question,
            expectedAnswer: c.expectedAnswer,
            actualAnswer: c.actualAnswer,
            sources: c.sources as Prisma.InputJsonValue | undefined,
            scores: c.scores as Prisma.InputJsonValue | undefined,
            latencyMs: c.latencyMs,
            passed: c.passed,
            notes: c.notes,
          })),
        },
      },
      include: { cases: true },
    });
  }

  /** Load seed dataset JSON (scaffolding — does not execute the assistant). */
  loadSeedDataset(): QaCaseSeed[] {
    const candidates = [
      path.resolve(process.cwd(), 'data/evaluation-qa-seed.json'),
      path.resolve(__dirname, '../../../../data/evaluation-qa-seed.json'),
    ];
    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        cases?: QaCaseSeed[];
      };
      return Array.isArray(raw.cases) ? raw.cases : [];
    }
    return [];
  }

  async seedPlaceholderRun(userId?: string) {
    const cases = this.loadSeedDataset();
    return this.createRun({
      name: 'Seed QA dataset (placeholder)',
      dataset: 'evaluation-qa-seed',
      mode: 'hybrid',
      userId,
      cases: cases.map((c) => ({
        question: c.question,
        expectedAnswer: c.expectedAnswer,
        notes: c.notes,
        passed: null as unknown as undefined,
      })),
    });
  }
}
