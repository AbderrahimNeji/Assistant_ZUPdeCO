import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import 'multer';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppLogger } from './common/logger/app-logger';
import { getAuthMode } from './modules/integration/request-context';

async function bootstrap() {
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error(
      'JWT_SECRET is required. Set it in the environment before starting the API.',
    );
  }

  if (process.env.NODE_ENV === 'production' && getAuthMode() !== 'firebase') {
    throw new Error(
      'Production requires AUTH_MODE=firebase so Copilot verifies Firebase ID tokens.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy === 'true' || trustProxy === '1') {
    app.set('trust proxy', 1);
  } else if (trustProxy && /^\d+$/.test(trustProxy)) {
    app.set('trust proxy', Number(trustProxy));
  }

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
      // Allow browser clients on a different origin (Vite :5173) to read API responses.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    compression({
      filter: (req, res) => {
        // SSE must not be buffered/compressed or tokens arrive in one burst.
        const url = req.originalUrl || req.url || '';
        if (url.includes('/assistant/chat/stream')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const frontendOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: frontendOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('ZUPdeCO AI Assistant API')
      .setDescription('Backend API for the ZUPdeCO AI Assistant (NestJS).')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          name: 'Authorization',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  AppLogger.info('API server started', {
    port: Number(port),
    swagger: enableSwagger,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  });
}

bootstrap().catch((error) => {
  AppLogger.error('Failed to bootstrap API', {}, error);
  process.exit(1);
});
