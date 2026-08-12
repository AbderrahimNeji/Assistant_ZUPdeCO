import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const SWAGGER_OPTIONS = {
  title: 'EdNov Backend API',
  description:
    'API monolithique EdNov : utilisateurs, profils, rôles et interface (RBAC), établissements et salles, référentiel académique, activités, sessions et binômes cœur, post-its, calendrier agrégé, tableau de bord, gamification, ressources, fil d’activité, recherche, branding, paramètres, assistant d’aide et spécialités.',
  version: '1.0.0',
  path: 'api-docs',
};

function buildSwaggerConfig(options: { title: string; description: string; version: string }) {
  return new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(
      options.description +
        '\n\n**Authentification :** les routes protégées attendent un jeton Firebase (ID token) dans l’en-tête `Authorization: Bearer <token>`. Les routes publiques (par ex. `GET /api/v1/public/branding/:companyCode`, `GET /api/v1/health`) n’exigent pas d’authentification.\n\n**Pagination :** les listes paginées suivent les conventions décrites dans la documentation interne du projet (paramètres de curseur / page selon l’endpoint).',
    )
    .setVersion(options.version)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID Token', name: 'Authorization' },
      'Firebase',
    )
    .build();
}

/** Build the OpenAPI document (for export to swagger.json or UI). */
export function getSwaggerDocument(
  app: INestApplication,
  options: { title: string; description: string; version: string } = SWAGGER_OPTIONS,
): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildSwaggerConfig(options));
}

export function setupSwagger(
  app: INestApplication,
  options: { title: string; description: string; version: string; path: string },
): void {
  const document = getSwaggerDocument(app, options);
  SwaggerModule.setup(options.path, app, document);
}
