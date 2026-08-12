import { Injectable } from '@nestjs/common';
import { DocumentKind, DocumentStatus } from '@prisma/client';

import { TtlCache } from '../../../common/cache/ttl-cache';
import { ErrorLogger } from '../../../common/logger/error-logger';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DocumentationHit } from './documentation.types';

const DEFAULT_SEMANTIC_WEIGHT = 0.68;
const DEFAULT_KEYWORD_WEIGHT = 0.22;
const DEFAULT_TITLE_WEIGHT = 0.1;
const CACHE_TTL_MS = 45_000;

/**
 * Hybrid retrieval over indexed functional documentation chunks.
 * Combines cosine similarity with keyword / title overlap; light re-rank; TTL cache.
 */
@Injectable()
export class DocumentationRetrievalService {
  private readonly cache = new TtlCache<DocumentationHit[]>(CACHE_TTL_MS, 64);

  constructor(private readonly prisma: PrismaService) {}

  /** Call after re-ingest so stale pools are dropped. */
  invalidateCache(): void {
    this.cache.clear();
  }

  async search(
    query: string,
    queryEmbedding: number[],
    topK = 6,
  ): Promise<DocumentationHit[]> {
    const start = performance.now();
    const cacheKey = `${topK}:${hashQuery(query)}:${hashEmbedding(queryEmbedding)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const chunks = await this.prisma.documentChunk.findMany({
        where: {
          document: {
            kind: DocumentKind.FUNCTIONAL_DOCUMENTATION,
            status: DocumentStatus.INDEXED,
          },
        },
        include: {
          document: {
            select: {
              name: true,
              slug: true,
              version: true,
              contentHash: true,
              ingestedAt: true,
            },
          },
        },
      });

      if (!chunks.length) {
        return [];
      }

      const queryTokens = tokenize(query);
      const scored: DocumentationHit[] = chunks.map((chunk) => {
        const semanticScore = cosineSimilarity(
          queryEmbedding,
          chunk.embedding as number[],
        );
        const keywordScore = keywordOverlap(queryTokens, [
          chunk.content,
          chunk.chapter ?? '',
          chunk.section ?? '',
          chunk.title ?? '',
          ...(chunk.keywords ?? []),
        ]);
        const titleBoost = titleProximity(queryTokens, [
          chunk.chapter ?? '',
          chunk.section ?? '',
          chunk.title ?? '',
        ]);
        const score =
          DEFAULT_SEMANTIC_WEIGHT * semanticScore +
          DEFAULT_KEYWORD_WEIGHT * keywordScore +
          DEFAULT_TITLE_WEIGHT * titleBoost;

        return {
          id: chunk.id,
          content: chunk.content,
          score,
          semanticScore,
          keywordScore,
          page: chunk.page,
          chapter: chunk.chapter,
          section: chunk.section,
          title: chunk.title,
          keywords: chunk.keywords ?? [],
          documentName: chunk.document.name,
          documentSlug: chunk.document.slug,
          version: chunk.document.version,
          contentHash: chunk.document.contentHash
            ? chunk.document.contentHash.slice(0, 12)
            : null,
          ingestedAt: chunk.document.ingestedAt
            ? chunk.document.ingestedAt.toISOString()
            : null,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      const deduped = dedupeHits(scored);
      // Light re-rank: prefer diverse pages/chapters in the top window.
      const reranked = lightRerank(deduped, Math.max(topK * 3, 12));
      const results = reranked.slice(0, topK);
      this.cache.set(cacheKey, results);

      ErrorLogger.logDuration(
        'DocumentationRetrievalService.search',
        performance.now() - start,
        { topK, resultCount: results.length, pool: chunks.length },
      );

      return results;
    } catch (error) {
      ErrorLogger.log(error, 'DocumentationRetrievalService.search', {
        topK,
      });
      throw error;
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 16);
}

function keywordOverlap(queryTokens: string[], fields: string[]): number {
  if (!queryTokens.length) return 0;
  const [content, chapter, section, title, ...keywords] = fields;
  const titleHay = [chapter, section, title, ...keywords]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const contentHay = (content ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  let titleHits = 0;
  let contentHits = 0;
  for (const token of queryTokens) {
    if (titleHay.includes(token)) titleHits += 1;
    else if (contentHay.includes(token)) contentHits += 1;
  }
  return Math.min(1, (titleHits * 1.35 + contentHits) / queryTokens.length);
}

function titleProximity(queryTokens: string[], fields: string[]): number {
  if (!queryTokens.length) return 0;
  const hay = fields
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!hay.trim()) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) hits += 1;
  }
  return Math.min(1, hits / queryTokens.length);
}

function dedupeHits(hits: DocumentationHit[]): DocumentationHit[] {
  const seen = new Set<string>();
  const out: DocumentationHit[] = [];
  for (const hit of hits) {
    const key = normalizeContentKey(hit.content);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

function lightRerank(hits: DocumentationHit[], window: number): DocumentationHit[] {
  const pool = hits.slice(0, window);
  const selected: DocumentationHit[] = [];
  const usedPages = new Set<number>();
  const usedChapters = new Set<string>();

  // Pass 1: greedily pick high-score hits with page/chapter diversity.
  for (const hit of pool) {
    const chapterKey = (hit.chapter || hit.section || '').toLowerCase();
    const pageUsed = usedPages.has(hit.page);
    const chapterUsed = chapterKey ? usedChapters.has(chapterKey) : false;
    if (selected.length && pageUsed && chapterUsed) continue;
    selected.push(hit);
    usedPages.add(hit.page);
    if (chapterKey) usedChapters.add(chapterKey);
    if (selected.length >= window) break;
  }

  // Pass 2: fill remaining by score.
  for (const hit of pool) {
    if (selected.includes(hit)) continue;
    selected.push(hit);
    if (selected.length >= window) break;
  }

  return selected;
}

function normalizeContentKey(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function hashQuery(query: string): string {
  return query.trim().toLowerCase().slice(0, 120);
}

function hashEmbedding(values: number[]): string {
  if (!values?.length) return '0';
  // Compact fingerprint — enough to separate nearby queries without storing full vector.
  const step = Math.max(1, Math.floor(values.length / 8));
  return values
    .filter((_, i) => i % step === 0)
    .slice(0, 8)
    .map((v) => v.toFixed(3))
    .join(',');
}
