/**
 * One-off smoke test for documentation RAG retrieval (not part of CI).
 * Run: npx ts-node -r tsconfig-paths/register scripts/smoke-documentation-rag.ts
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { EmbeddingService } from '../src/modules/documents/services/embedding.service';
import { DocumentationRetrievalService } from '../src/modules/knowledge/documentation/documentation-retrieval.service';
import { QuestionRouterService } from '../src/modules/knowledge/documentation/question-router.service';
import { KnowledgeOrchestratorService } from '../src/modules/knowledge/knowledge-orchestrator.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const embed = app.get(EmbeddingService);
  const retrieval = app.get(DocumentationRetrievalService);
  const orchestrator = app.get(KnowledgeOrchestratorService);
  const router = app.get(QuestionRouterService);

  const queries = [
    "Qu'est-ce qu'un tuteur ?",
    'Comment fonctionne le matching ?',
    "Combien d'élèves ?",
  ];

  for (const q of queries) {
    const route = router.route(q);
    const vector = await embed.embed(q);
    const hits = await retrieval.search(q, vector, 3);
    const knowledge = await orchestrator.retrieve({
      userId: 'smoke-user',
      conversationId: 'smoke-conv',
      query: q,
      queryEmbedding: vector,
      topK: 5,
    });
    console.log('\n===', q);
    console.log(
      'route=',
      route.intent,
      'useDoc=',
      route.useDocumentation,
      'useBiz=',
      route.useBusiness,
    );
    console.log(
      'hits=',
      hits.map((h) => ({
        score: Number(h.score.toFixed(3)),
        page: h.page,
        chapter: h.chapter?.slice(0, 40),
        section: h.section?.slice(0, 50),
        preview: h.content.slice(0, 110).replace(/\n/g, ' '),
      })),
    );
    console.log(
      'orchestrator snippets=',
      knowledge.snippets.length,
      'sources=',
      knowledge.snippets.map((s) => s.source),
      'routeIntent=',
      knowledge.routeIntent,
    );
    if (knowledge.snippets[0]) {
      console.log('top title=', knowledge.snippets[0].title);
      console.log('top page=', knowledge.snippets[0].page);
    }
  }

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
