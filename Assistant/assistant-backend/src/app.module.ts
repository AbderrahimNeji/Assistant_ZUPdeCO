import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { IntegrationModule } from './modules/integration/integration.module';
import { RequestContextMiddleware } from './modules/integration/request-context.middleware';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { LanguageModule } from './modules/language/language.module';
import { IntentModule } from './modules/intent/intent.module';
import { MemoryModule } from './modules/memory/memory.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { PromptBuilderModule } from './modules/prompt-builder/prompt-builder.module';
import { LlmModule } from './modules/llm/llm.module';
import { VoiceModule } from './modules/voice/voice.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SourcesModule } from './modules/sources/sources.module';
import { HealthModule } from './modules/health/health.module';
import { BenchmarkModule } from './modules/benchmark/benchmark.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
      {
        name: 'auth',
        ttl: Number(process.env.AUTH_THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 20),
      },
    ]),

    PrismaModule,
    IntegrationModule,

    UsersModule,
    AuthModule,
    ConversationModule,

    AssistantModule,

    LanguageModule,
    IntentModule,
    MemoryModule,
    KnowledgeModule,
    PromptBuilderModule,
    LlmModule,
    VoiceModule,

    DocumentsModule,
    SourcesModule,
    HealthModule,
    BenchmarkModule,
    EvaluationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, RequestIdMiddleware)
      .forRoutes('*');
  }
}
