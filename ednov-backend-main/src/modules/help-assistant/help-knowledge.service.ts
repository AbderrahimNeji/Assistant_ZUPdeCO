import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import MiniSearch from 'minisearch';

export interface HelpChunk {
  id: string;
  title: string;
  body: string;
  sourceFile: string;
}

/** Result of retrieval for one user question (used by HelpAssistantService). */
export interface HelpSearchOutcome {
  chunks: HelpChunk[];
  /** Highest score after merge and menu boost (MiniSearch BM25-style; magnitude varies). */
  topScore: number;
  /** True when optional env says top score is below configured threshold. */
  weakMatch: boolean;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function parseMarkdownFile(fileName: string, content: string): HelpChunk[] {
  const base = fileName.replace(/\.md$/i, '');
  const chunks: HelpChunk[] = [];
  const parts = content.split(/\n(?=##\s+)/);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    let title: string;
    let body: string;

    if (part.startsWith('## ')) {
      const endLine = part.indexOf('\n');
      title = (endLine === -1 ? part.slice(3) : part.slice(3, endLine)).trim();
      body = endLine === -1 ? '' : part.slice(endLine + 1).trim();
    } else if (part.startsWith('# ')) {
      const endLine = part.indexOf('\n');
      title = (endLine === -1 ? part.slice(2) : part.slice(2, endLine)).trim();
      body = endLine === -1 ? '' : part.slice(endLine + 1).trim();
    } else {
      title = base.replace(/-/g, ' ');
      body = part;
    }

    const cappedBody = body.length > 800 ? `${body.slice(0, 797)}...` : body;
    const id = `${base}#${i}-${slugify(title) || 'section'}`;
    chunks.push({ id, title, body: cappedBody, sourceFile: fileName });
  }

  return chunks;
}

/** Add French / product synonyms to improve recall (deterministic, no LLM). */
function expandQueryTerms(query: string): string {
  const q = query.trim();
  if (!q) return q;
  const extras: string[] = [];
  const lower = q.toLowerCase();

  if (/\bsessions?\b/i.test(q)) extras.push('séances séance');
  if (/\bséances?\b/i.test(q)) extras.push('session');
  if (/\bassign\w*|\battribu\w*/i.test(q)) extras.push('participants élève tuteur affectation');
  if (/\bélèves?\b|\beleve\w*|\bstudents?\b/i.test(q)) extras.push('élève participants');
  if (/\btuteurs?\b|\btutor\w*/i.test(q)) extras.push('tuteur participants');
  if (/\bmatching\b/i.test(q)) extras.push('mise en relation binôme');
  if (/\bcalendrier\b/i.test(q)) extras.push('créneau vue temporelle');
  if (/\bprogrammes?\b/i.test(q)) extras.push('dispositif pédagogique');
  if (/\bétablissements?\b|\buai\b/i.test(q)) extras.push('école structure');
  if (/\bmatières?\b|\bsubjects?\b/i.test(q)) extras.push('discipline');
  if (/base\s*de\s*données|\bbdd\b|\bsql\b|\btable\w*/i.test(q))
    extras.push('limites documentation technique');
  if (/\bgamification\b|\bgamifie/i.test(q)) extras.push('xp badges niveaux classement leaderboard tuteur');
  if (/\bleaderboard\b|\bclassement\b.*\bxp\b|\bxp\b.*\bclassement/i.test(q))
    extras.push('gamification leaderboard');
  if (/\bpoints?\s*d['’]expérience\b|\bxp\b|\bbadges?\b|\bdéfis?\b/i.test(q))
    extras.push('gamification niveaux tuteur');

  return extras.length ? `${q} ${extras.join(' ')}` : q;
}

type MenuHint = {
  /** User query matches */
  test: (query: string) => boolean;
  /** Boost chunks whose source file name contains one of these (lowercase) */
  fileNeedles: string[];
  factor: number;
};

const MENU_HINTS: MenuHint[] = [
  { test: (q) => /\bmatching\b/i.test(q), fileNeedles: ['matching'], factor: 1.5 },
  { test: (q) => /\b(séance|seance|session)s?\b/i.test(q), fileNeedles: ['seances'], factor: 1.45 },
  { test: (q) => /\bcalendrier\b/i.test(q), fileNeedles: ['calendrier', 'seances'], factor: 1.35 },
  { test: (q) => /\bélève|eleve|student/i.test(q), fileNeedles: ['seances', 'matching', 'etablissements'], factor: 1.2 },
  { test: (q) => /\btuteur/i.test(q), fileNeedles: ['seances', 'matching'], factor: 1.2 },
  { test: (q) => /\bpermission|accès|autoris/i.test(q), fileNeedles: ['permissions'], factor: 1.4 },
  { test: (q) => /base\s*de\s*données|\bbdd\b|schéma|sql|\btable\w*/i.test(q), fileNeedles: ['limites-documentation'], factor: 1.55 },
  { test: (q) => /\bprogramme/i.test(q), fileNeedles: ['programmes'], factor: 1.35 },
  { test: (q) => /\bétablissement|\bmatière/i.test(q), fileNeedles: ['etablissements'], factor: 1.35 },
  {
    test: (q) =>
      /\bgamification\b|\bleaderboard\b|\bclassement\b.*\bxp\b|\bxp\b.*\btuteur|\bbadges?\b.*\bxp\b|\bdéfis?\b/i.test(
        q,
      ),
    fileNeedles: ['gamification'],
    factor: 1.55,
  },
];

@Injectable()
export class HelpKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(HelpKnowledgeService.name);
  private miniSearch: MiniSearch | null = null;
  private readonly chunkById = new Map<string, HelpChunk>();
  private readonly weakScoreMax: number | null;

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('HELP_KNOWLEDGE_WEAK_SCORE_MAX')?.trim();
    if (raw === undefined || raw === '') {
      this.weakScoreMax = null;
    } else {
      const n = Number.parseFloat(raw);
      this.weakScoreMax = Number.isFinite(n) ? n : null;
    }
  }

  onModuleInit(): void {
    const knowledgeDir = join(__dirname, 'knowledge');
    if (!existsSync(knowledgeDir)) {
      this.logger.warn(`Help knowledge directory missing: ${knowledgeDir}`);
      return;
    }

    const files = readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));
    const allChunks: HelpChunk[] = [];
    for (const file of files) {
      const raw = readFileSync(join(knowledgeDir, file), 'utf-8');
      allChunks.push(...parseMarkdownFile(file, raw));
    }

    for (const c of allChunks) {
      this.chunkById.set(c.id, c);
    }

    if (allChunks.length === 0) {
      this.logger.warn('No help knowledge chunks loaded (.md files empty or missing)');
      return;
    }

    const mini = new MiniSearch({
      fields: ['title', 'text'],
      storeFields: ['title', 'text'],
      idField: 'id',
    });

    mini.addAll(
      allChunks.map((c) => ({
        id: c.id,
        title: c.title,
        text: `${c.title}\n${c.body}`,
      })),
    );

    this.miniSearch = mini;
    this.logger.log(`Help knowledge indexed: ${allChunks.length} chunks from ${files.length} file(s)`);
  }

  /**
   * Legacy single-query search (max `limit` chunks).
   */
  search(query: string, limit = 5): HelpChunk[] {
    return this.searchWithOutcome(query, limit).chunks;
  }

  /**
   * Merge MiniSearch on original + expanded query, dedupe by chunk id, apply menu/file boost, rank by score.
   */
  searchWithOutcome(query: string, limit = 5): HelpSearchOutcome {
    const q = query.trim();
    if (!this.miniSearch || !q) {
      return { chunks: [], topScore: 0, weakMatch: false };
    }

    const variants = [q, expandQueryTerms(q)];
    const uniqueVariants = [...new Set(variants.map((s) => s.trim()).filter(Boolean))];

    const scoreById = new Map<string, number>();

    for (const v of uniqueVariants) {
      const hits = this.miniSearch.search(v, { fuzzy: 0.2, prefix: true });
      for (const h of hits) {
        const id = String(h.id);
        const prev = scoreById.get(id) ?? 0;
        const s = typeof h.score === 'number' ? h.score : 0;
        scoreById.set(id, Math.max(prev, s));
      }
    }

    const boosted: Array<{ id: string; score: number }> = [];
    for (const [id, base] of scoreById) {
      const chunk = this.chunkById.get(id);
      if (!chunk) continue;
      let score = base;
      const fileLower = chunk.sourceFile.toLowerCase();
      for (const hint of MENU_HINTS) {
        if (!hint.test(q)) continue;
        if (hint.fileNeedles.some((n) => fileLower.includes(n.toLowerCase()))) {
          score *= hint.factor;
        }
      }
      boosted.push({ id, score });
    }

    boosted.sort((a, b) => b.score - a.score);
    const top = boosted.slice(0, limit);
    const chunks = top.map((t) => this.chunkById.get(t.id)!).filter(Boolean);
    const topScore = top.length > 0 ? top[0].score : 0;
    const weakMatch =
      this.weakScoreMax !== null && chunks.length > 0 && topScore < this.weakScoreMax;

    return { chunks, topScore, weakMatch };
  }
}
