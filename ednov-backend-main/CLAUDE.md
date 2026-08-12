# EdNov Backend — Project Context

## Overview

NestJS monolith backend for the EdNov tutoring platform. Multi-tenant (company-scoped), PostgreSQL via TypeORM, Firebase Admin for JWT auth.

## Tech Stack

- **Runtime**: Node.js >= 20
- **Framework**: NestJS 11, TypeScript 5
- **Database**: PostgreSQL (Supabase-hosted), TypeORM 0.3
- **Auth**: Firebase Admin (JWT verification only — no session, no local login)
- **Email**: SendGrid
- **AI/STT**: Groq (Whisper + LLM)
- **Validation**: class-validator + class-transformer (global ValidationPipe)
- **Docs**: @nestjs/swagger (Swagger UI at `/api-docs`, only in non-prod)

## Commands

```bash
npm run dev                   # Start with watch
npm run build                 # Compile
npm run start:prod            # Run compiled output
npm run typecheck             # tsc --noEmit
npm run lint                  # ESLint src + test
npm run test                  # Jest
npm run test:cov              # Jest with coverage
npm run migration:run         # Apply all pending migrations
npm run migration:generate -- migrations/Name  # Generate migration from entity diff
npm run migration:create -- migrations/Name    # Empty migration
npm run migration:revert      # Rollback last migration
npm run migration:show        # List applied / pending
npm run seed:all              # Run all seeders
npm run swagger:fetch         # Regenerate docs/swagger.json (server must be running)
```

## Project Structure

```
src/
  app.module.ts
  main.ts
  auth/                  # FirebaseJwtGuard, @Public(), @Roles(), RolesGuard
  common/
    config/              # Joi env validation schema
    entities/            # BaseEntity (id, createdAt, updatedAt)
    filters/             # Global HTTP exception filter
    interceptors/        # Response transform, logging
    utils/               # Shared utilities
    visibility/          # Visibility scope helpers
  health/                # GET /api/v1/health
  modules/
    academic/            # Programs, levels, subjects, school-years, holidays
    activity/            # Activities + activity types
    audit/               # AuditService — log every CUD action
    branding/            # White-label logos, colors, fonts
    companies/           # Company (tenant root) + establishments + rooms
    dashboard/           # Stats and KPIs by role scope
    gamification/        # XP, levels, badges, leaderboard
    groq/                # AI session reports + help assistant
    interface-elements/  # UI element definitions + role permissions
    matching/            # Student–tutor pair matching
    notifications/       # Push notifications
    post-its/            # Post-it notes per establishment
    profiles/            # User profile data (students, tutors, volunteers)
    roles/               # Role definitions + role groups
    rules/               # Visibility scope rules + overrides
    sessions/            # Sessions, participants, reports, VSC reports
    settings/            # App settings + feature flags
    specialties/         # Subject specialties
    student-status-history/
    user-preferences/    # Per-user UI preferences (dark mode, interface configs)
    users/               # User CRUD + GET /users/login
  database/
    seeders/             # All seed scripts + JSON data files
  scripts/               # One-off data migration scripts
migrations/              # TypeORM migration files (timestamped)
docs/                    # API docs, Swagger JSON, architecture notes
sql/                     # full-schema.sql (source of truth for initial schema)
```

## API Conventions

- **Prefix**: all routes under `/api/v1`
- **Public routes**: mark with `@Public()` decorator (`src/auth/public.decorator.ts`)
- **Auth**: `Authorization: Bearer <Firebase ID token>` on all protected routes
- **Login endpoint**: `GET /api/v1/users/login` — returns full user profile after verifying Firebase token
- **Health**: `GET /api/v1/health` — public, checks DB + Firebase

## Code Conventions

### Module structure (one module = one folder)
```
src/modules/<domain>/
  dto/
    create-<entity>.dto.ts
    update-<entity>.dto.ts
  entities/
    <entity>.entity.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.module.ts
```

### Entities
- Extend or mirror `BaseEntity` pattern: `id` (uuid, gen_random_uuid()), `createdAt`, `updatedAt`, `deletedAt`
- Always include `companyId` column (multi-tenancy)
- Column names: `snake_case` in DB, `camelCase` in TypeScript via `{ name: 'snake_case' }`

### Services
- Always filter queries by `companyId` — never leak cross-tenant data
- Always use soft delete: `repository.softDelete(id)` — never `delete()`
- Always call `AuditService.log()` on every CREATE / UPDATE / DELETE
- Raise `NotFoundException` for missing resources, `ForbiddenException` for access denied
- Use `Logger` for errors and important actions: `private readonly logger = new Logger(ServiceName.name)`

### Controllers
- Thin — delegate all logic to service
- Decorate with `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`
- Extract user from request via `@CurrentUser()` decorator (returns `RequestUserPayload`)
- Pass `companyId` and `userId` to every service call

### DTOs
- Use `class-validator` decorators: `@IsString()`, `@IsEmail()`, `@IsUUID()`, `@IsOptional()`, etc.
- Update DTOs extend `PartialType(CreateDto)`
- Global `ValidationPipe` is already active — no need to add per-route

### Migrations
- Filename: `<timestamp>-<PascalCaseName>.ts` — use `npm run migration:create`
- Every new table must have: `company_id` FK to `companies`, `created_at`, `updated_at`, `deleted_at`
- Always create indexes on `company_id` and `deleted_at`
- Never use `synchronize: true` in production

## Auth Flow Summary

1. Client signs in via Firebase Auth → receives Firebase ID token (JWT)
2. Client sends `Authorization: Bearer <token>` on every request
3. `FirebaseJwtGuard` calls Firebase Admin `verifyIdToken(token)`
4. `AuthService.getUserByFirebaseUid(uid)` loads user from DB, verifies `status = active`
5. `request.user` is set to `{ uid, companyId, roles, ... }` as `RequestUserPayload`

## Multi-Tenancy Rule

**Every** DB query must be scoped to `companyId`. No exceptions.

```typescript
// Always
repository.find({ where: { companyId } })
repository.findOne({ where: { id, companyId } })
```

## Environment Variables (see .env.example)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `DATABASE_SSL` | yes (Supabase) | Set `true` for TLS |
| `FIREBASE_PROJECT_ID` | yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | yes | Service account email |
| `FIREBASE_PRIVATE_KEY` | yes | Service account private key |
| `FIREBASE_WEB_API_KEY` | optional | For sending invitation emails |
| `FRONTEND_URL` | yes | Used as `continueUrl` base in invitations |
| `SENDGRID_API_KEY` | optional | Transactional email |
| `GROQ_API_KEY` | optional | AI report generation |
| `CORS_ORIGINS` | yes | Comma-separated allowed origins |

## Key Boundaries

- Never commit `.env` — it is gitignored; keep `.env.example` up to date
- Never add `synchronize: true` to TypeORM config in production
- Never perform hard deletes — always soft delete
- Never bypass multi-tenant filtering by omitting `companyId`
- No hardcoded secrets — use `process.env` validated via Joi schema in `src/common/config/`
- Ask before modifying database schema (requires a migration)
- Run `npm run typecheck` and `npm run lint` before committing

## Patterns to Follow

### New module checklist
1. Create folder structure under `src/modules/<domain>/`
2. Entity with `companyId`, timestamps, soft-delete column
3. Create/Update DTOs with class-validator
4. Service with companyId filtering, soft delete, audit logging
5. Controller with Swagger decorators and `@CurrentUser()`
6. NestJS module file importing `TypeOrmModule.forFeature([Entity])`
7. Import module in `src/app.module.ts`
8. Migration with indexes on `company_id` and `deleted_at`

### Finding existing patterns
- Auth guard usage: `src/auth/firebase-jwt.guard.ts`
- Audit logging: `src/modules/audit/audit.service.ts`
- Visibility scopes: `src/common/visibility/`
- Interface element permissions: `src/modules/interface-elements/`
- Role-based access: `src/auth/roles.guard.ts` + `src/auth/roles.decorator.ts`
