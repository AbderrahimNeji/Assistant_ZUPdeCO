# ZUPdeCO workspace (Ednov + Assistant)

Local workspace that combines **Ednov** (tutoring platform: API, web, mobile) with a **RAG / copilot assistant**. The npm package at the repo root is named `all-app` and only provides scripts to start several services together.

Nested READMEs under `Assistant/`, `ednov-backend-main/`, and `ednov-mobile-v2-main/` remain the detailed references for each package.

## Purpose

Ednov is a NestJS + PostgreSQL backend with a Vite web app and an Expo mobile app. It authenticates users with **Firebase**. The Assistant is a separate NestJS API (Prisma + PostgreSQL) that chats with **Google Gemini**, retrieves from uploaded documents and official documentation, and can call Ednov REST APIs when the copilot is embedded in the web app.

## What is in this repository

| Path | Role (from the tree) |
| --- | --- |
| `package.json` (`all-app`) | Root scripts: `dev:all`, `dev:ednov`, `dev:assistant`, `dev:web`, `dev:stack` |
| `scripts/dev-stack.sh` | Creates local Postgres databases `ednov` and `assistant_ai` if missing, then prints how to start services |
| `Assistant/` | Standalone assistant: Nest API, Next.js UI, Docker Compose |
| `ednov-backend-main/` | Ednov NestJS monolith (`/api/v1`) |
| `ednov-web-main/` | Ednov Vite + React UI, including the copilot shell |
| `ednov-mobile-v2-main/` | Ednov Expo / React Native app |
| `docs/database/` | Schema dump and integration notes for the copilot ↔ Ednov APIs |

The `*-main` directory names match GitHub zip-style exports. They are the actual package roots used by the scripts (not `ednov-backend/` as some nested docs still say).

## Architecture

```
ednov-web (:5173)  --Firebase token-->  ednov-backend (:3000/api/v1)
        |                                      ^
        | VITE_ASSISTANT_API_URL               | adapters (same bearer)
        v                                      |
assistant-backend (:3001/api)  ----------------+
        ^
        | optional standalone UI
assistant-frontend (:3000)   AUTH_MODE=local JWT
```

**Ednov API** — `ednov-backend-main/src/main.ts`. Global prefix `/api/v1`. Firebase Admin verifies ID tokens. Health: `GET /api/v1/health`. Swagger is documented as `/api-docs` outside production.

**Ednov web** — `ednov-web-main/src/main.tsx`, Vite port **5173**. Copilot UI lives in `src/features/copilot/` and calls the assistant at `VITE_ASSISTANT_API_URL` (default `http://localhost:3001/api`).

**Ednov mobile** — Expo Router entry `expo-router/entry`. Not started by `npm run dev:all`.

**Assistant API** — `Assistant/assistant-backend/src/main.ts`. Prefix `/api`. Default port **3001**. JWT secret is required at boot. Production requires `AUTH_MODE=firebase`. Swagger at `/api/docs` when not production (or `ENABLE_SWAGGER=true`).

**Standalone assistant UI** — Next.js 15 App Router, `Assistant/assistant-frontend`. Home redirects to `/assistant`. Also has login, register, documents, benchmark, settings. **Not** included in `npm run dev:all`. Next’s default port is 3000, which collides with the Ednov API if both run at once.

### Assistant internals (implemented in code)

- **Auth:** local email/password JWT (`AUTH_MODE=local`) or Firebase (`AUTH_MODE=firebase`) for the Ednov copilot. Public register is gated by `ENABLE_PUBLIC_REGISTER`. Logout writes revoked tokens in Postgres.
- **Database:** Prisma models for users, conversations/messages, documents/chunks, benchmarks, evaluation, workflow jobs. PostgreSQL. Chunk embeddings are stored as **JSON** (not pgvector); retrieval is cosine similarity in `RetrievalService`.
- **Documents / RAG:** upload pipeline (`DocumentsService` + LangChain `RecursiveCharacterTextSplitter` + `@xenova/transformers` model `Xenova/all-MiniLM-L6-v2`). Official PDF ingest via `DocumentationIngestService` and `npm run ingest:documentation`.
- **LLM:** LangChain `ChatGoogleGenerativeAI` in `llm.service.ts` (`GEMINI_API_KEY`, `GEMINI_MODEL`).
- **Ednov live data:** `EdnovApiClient` (`EDNOV_API_BASE_URL`, default `http://localhost:3000/api/v1`) plus knowledge/application providers and business-skill adapters. Wired through `AssistantModule` (actions, workflow, evaluation, small-talk, …).
- **Health:** `GET /api/health`, `/api/health/live`, `/api/health/ready`.

Ednov backend also has a **separate** Groq-based help/session AI (`GROQ_API_KEY` in `ednov-backend-main`). That is not the Gemini copilot.

### Incomplete or unused pieces (confirmed)

- `VoiceService` in the assistant backend is an empty class.
- `Assistant/assistant-frontend/.env.local.example` is referenced in `Assistant/README.md` but **is not in the tree**. Create `.env.local` with `NEXT_PUBLIC_API_URL` if you run that UI.
- Root `dev:all` does not start mobile or the Next.js assistant UI.
- Nested Ednov READMEs still say `cd ednov-backend` / `cd ednov-mobile-v2`; the folders here are `ednov-backend-main` and `ednov-mobile-v2-main`.

## Tech stack (from package manifests)

- Assistant API: NestJS 11, Prisma, PostgreSQL, Passport JWT, Gemini (`@langchain/google-genai`), LangChain text splitters, Xenova Transformers, Firebase Admin, Helmet, Throttler
- Assistant UI: Next.js 15, React 19, TanStack Query, Zustand, Axios, Tailwind 4, Vitest
- Ednov API: NestJS, TypeORM, PostgreSQL, Firebase Admin, optional Groq
- Ednov web: Vite, React, TanStack Query, Firebase, Axios
- Ednov mobile: Expo / React Native, Expo Router, Firebase Auth

## Prerequisites

- Node.js 20+ (Ednov backend README) and npm
- PostgreSQL (local or Docker). `scripts/dev-stack.sh` also expects the `psql` client
- Firebase project for Ednov login (and for assistant `AUTH_MODE=firebase`)
- `GEMINI_API_KEY` for assistant chat

## Environment files

Copy examples; do not commit filled `.env` files. Root `.gitignore` already ignores `.env`.

| Example file | Used by |
| --- | --- |
| `ednov-backend-main/.env.example` | Ednov API (`DATABASE_URL`, `FIREBASE_*`, `CORS_ORIGINS`, optional `GROQ_API_KEY`) |
| `ednov-web-main/.env.example` | Ednov web (`VITE_API_URL`, `VITE_ASSISTANT_API_URL`, `VITE_FIREBASE_*`, `VITE_ENABLE_COPILOT`) |
| `ednov-mobile-v2-main/.env.example` | Mobile (`EXPO_PUBLIC_*`; see that package’s env docs) |
| `Assistant/assistant-backend/.env.example` | Assistant API (`DATABASE_URL`, `JWT_SECRET`, `AUTH_MODE`, `GEMINI_API_KEY`, `EDNOV_API_BASE_URL`, `CORS_ORIGINS`) |
| `Assistant/.env.example` | `Assistant/docker-compose.yml` (Postgres + API/UI ports) |

`scripts/dev-stack.sh` notes that login will not work until Firebase placeholders in Ednov `.env` files are replaced.

## Local development

Install dependencies **in each package you run** (`ednov-backend-main`, `Assistant/assistant-backend`, `ednov-web-main`, and optionally the others). Root `npm install` only installs `concurrently`.

1. Copy the `.env.example` files above into `.env` (and `.env.local` for the Next UI if needed).
2. Create databases. Either run `bash scripts/dev-stack.sh` (requires `psql` on localhost) or create `ednov` and `assistant_ai` yourself.
3. Ednov schema: `cd ednov-backend-main && npm run migration:run` (and seed scripts if you need demo data; see that README).
4. Assistant schema: `cd Assistant/assistant-backend && npx prisma migrate deploy && npx prisma generate`. Optional: `npm run prisma:seed` for local JWT demo users (`prisma/seed.ts`).
5. Start the three services used by the web copilot:

```bash
# from repo root, after per-package install + env
npm run dev:all
```

This runs, concurrently:

| Script | Command | Typical URL |
| --- | --- | --- |
| `dev:ednov` | `npm --prefix ednov-backend-main run dev` | http://localhost:3000 |
| `dev:assistant` | `npm --prefix Assistant/assistant-backend run start:dev` | http://localhost:3001 |
| `dev:web` | `npm --prefix ednov-web-main run dev` | http://localhost:5173 |

Same processes can be started in three terminals; `dev-stack.sh` prints those commands.

Optional:

```bash
cd Assistant/assistant-frontend && npm run dev   # Next UI, default :3000
cd ednov-mobile-v2-main && npm start             # Expo
```

Assistant-only Docker (Postgres + API + Next UI), from `Assistant/`:

```bash
cp .env.example .env
docker compose up -d --build
```

Compose requires `JWT_SECRET` and `GEMINI_API_KEY`. Health check for the API is `GET /api/health/ready`. More detail: `Assistant/DEPLOYMENT.md`.

## Tests

| Package | Script | What it is |
| --- | --- | --- |
| `Assistant/assistant-backend` | `npm test` (Jest `*.spec.ts`), `npm run test:e2e` | Large unit suite + e2e config under `test/` |
| `Assistant/assistant-frontend` | `npm test` (Vitest) | Tests under `src/features/**` |
| `ednov-backend-main` | `npm test` (Jest) | Service/guard unit tests |
| `ednov-web-main` | none in `package.json` | No test script |
| `ednov-mobile-v2-main` | none in the listed scripts | No unit-test script in `package.json` |

Checked in this environment (Node 22, no Postgres/Docker):

- `Assistant/assistant-frontend`: `npm test` — 4 tests passed (3 files).
- `Assistant/assistant-backend`: `npm test` — 179 passed, 22 failed (12 of 39 suites). Failures were Nest testing-module errors (missing `PrismaService` / controller providers), not a full runtime of the API.
- `npm run test:e2e`, Ednov package tests, `npm run dev:all`, and Docker were not run here (`psql` and `docker` were unavailable).

## Git history / contribution

This GitHub repo currently has two commits on `main`, both by **AbderrahimNeji**: “Import full All-App workspace” and “Update workspace changes”. That is the evidence that this workspace was imported and updated here. Nested packages look like a larger Ednov/ZUPdeCO codebase; this README does not assign individual features to a single author beyond that history.

## Further reading

- `Assistant/README.md` — assistant setup, Docker, security notes
- `ednov-backend-main/README.md` — Firebase login flow, TypeORM migrations, seeds
- `ednov-mobile-v2-main/README.md` — Expo app
- `docs/database/PRODUCTION_INTEGRATION_REPORT.md` — copilot ↔ Ednov API wiring notes
