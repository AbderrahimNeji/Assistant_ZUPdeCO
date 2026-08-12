import './polyfill-web-globals';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SseAwareClassSerializerInterceptor } from './common/interceptors/sse-aware-serializer.interceptor';
import { winstonConfig } from './common/logger';
import { setupSwagger, SWAGGER_OPTIONS } from './common/swagger';
import type { Request, Response } from 'express';
import compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });

  // Initialize Firebase Admin after app create so ConfigModule has loaded .env
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '';
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey || undefined,
      }),
    });
  }

  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  // Skip compression for SSE: buffering breaks `text/event-stream` and can cause reconnect loops.
  app.use(
    compression({
      filter: (req: Request, res: Response) => {
        const p = req.path || String(req.url ?? '').split('?')[0] || '';
        if (p.includes('/notifications/stream')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // When credentials: true, origin cannot be '*'. Support wildcard by reflecting
  // the request Origin when CORS_ORIGINS is '*' or includes '*'.
  const corsOriginsRaw = process.env.CORS_ORIGINS?.trim();
  const isWildcard = !corsOriginsRaw || corsOriginsRaw === '*';
  const allowedOrigins = isWildcard ? [] : corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: isWildcard
      ? true // Reflect any origin when wildcard
      : allowedOrigins.length > 0
        ? allowedOrigins
        : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new SseAwareClassSerializerInterceptor(app.get(Reflector)),
  );

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app, SWAGGER_OPTIONS);
  }

  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`[${process.env.SERVICE_NAME || 'ednov-backend'}] running on port ${port}`);
  console.log(`API docs: http://localhost:${port}/api-docs`);
}

bootstrap();
