# ZUPdeCO AI Assistant

Standalone RAG assistant for ZUPdeCO — chat, knowledge-base documents, and evaluation benchmarks.

## Architecture overview

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind, React Query, Zustand, Axios |
| Backend | NestJS, Prisma, PostgreSQL, JWT auth, Gemini + local embeddings |
| Domains | Auth, Conversations/Chat, Documents (RAG), Benchmarks |

```
Assistant/
├── docker-compose.yml
├── DEPLOYMENT.md
├── assistant-frontend/     # Next.js UI
│   └── src/
│       ├── app/            # Routes
│       └── features/       # auth, chat, documents, benchmark, shared
└── assistant-backend/      # NestJS API
    ├── prisma/             # Schema + migrations
    └── src/modules/        # auth, assistant, conversation, documents, benchmark, …
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or Docker)
- Gemini API key (`GEMINI_API_KEY`)

## Environment variables

### Backend (`assistant-backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Strong secret (≥32 chars in production) |
| `JWT_EXPIRES_IN` | No | Access token TTL (default `24h`) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `PORT` | No | API port (default `3001`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `NODE_ENV` | No | Set `production` for release |
| `TRUST_PROXY` | No | `1` when behind a reverse proxy |
| `ENABLE_SWAGGER` | No | Force Swagger on/off (`true` enables) |
| `ENABLE_PUBLIC_REGISTER` | No | Set `true` to allow `POST /auth/register` |
| `THROTTLE_LIMIT` | No | Global rate limit per minute |
| `SLOW_REQUEST_MS` | No | Slow request log threshold |

### Frontend (`assistant-frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base, e.g. `http://localhost:3001/api` |

Copy `assistant-frontend/.env.local.example`, `assistant-backend/.env.example`, and root `.env.example` (Docker).

## Installation

```bash
# Backend
cd assistant-backend
npm install
cp .env.example .env   # then edit secrets

# Frontend
cd ../assistant-frontend
npm install
cp .env.local.example .env.local
```

## Database migration

```bash
cd assistant-backend
npx prisma migrate deploy
npx prisma generate
```

For local schema iteration: `npx prisma migrate dev`.

## Development commands

```bash
# API (http://localhost:3001, Swagger at /api/docs in non-production)
cd assistant-backend
npm run start:dev

# Web (http://localhost:3000)
cd assistant-frontend
npm run dev

# Tests
cd assistant-backend && npm test
cd assistant-frontend && npm test
```

Demo login (if seeded): `demo@zupdeco.fr` / `Password123`

## Production build

```bash
# Backend
cd assistant-backend
npm run build
NODE_ENV=production npm run start:prod

# Frontend
cd assistant-frontend
npm run build
npm run start
```

## Docker usage

```bash
cp .env.example .env
docker compose up -d --build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for health checks, backups, rollback, and scaling.

## Deployment steps

1. Provision PostgreSQL and set secrets (never commit `.env`).
2. Deploy backend with `NODE_ENV=production` and a strong `JWT_SECRET`.
3. Run `npx prisma migrate deploy` (Compose does this on backend start).
4. Point `NEXT_PUBLIC_API_URL` at the public API URL (`…/api`).
5. Set `CORS_ORIGINS` to the frontend origin(s).
6. Keep `ENABLE_PUBLIC_REGISTER` unset/false unless intentional.
7. Leave Swagger disabled in production unless `ENABLE_SWAGGER=true`.
8. Smoke-test: login → chat → upload document → run benchmark.

## Security notes

- JWT is required; missing/weak secrets refuse to boot in production.
- Logout revokes the bearer token until expiry (shared Postgres denylist).
- Public registration is disabled by default.
- `/users` is admin-only and never returns password hashes.
- Benchmarks, documents, and conversations are scoped to the authenticated user.
- Async benchmark jobs are persisted in PostgreSQL (survive restarts / multi-instance polls).
- Document uploads are capped at 15MB with MIME + extension allowlisting.
- Helmet, compression, CORS, and rate limiting are enabled on the API.
