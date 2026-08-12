/**
 * Generates swagger.json with all implemented API routes.
 * Run: npm run swagger:generate
 * Output: docs/swagger.json
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getSwaggerDocument, SWAGGER_OPTIONS } from '../common/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const document = getSwaggerDocument(app, SWAGGER_OPTIONS);
  const outputDir = path.join(process.cwd(), 'docs');
  const outputPath = path.join(outputDir, 'swagger.json');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  await app.close();
  console.log(`Swagger document written to ${outputPath}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
