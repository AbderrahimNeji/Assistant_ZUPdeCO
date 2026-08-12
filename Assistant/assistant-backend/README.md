# ZUPdeCO AI Assistant — Backend

NestJS API for the ZUPdeCO AI Assistant (auth, RAG chat, documents, benchmarks).

See the monorepo root [README](../README.md) for full setup, env vars, migrations, and deployment.

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

API: `http://localhost:3001/api`  
Swagger (non-production): `http://localhost:3001/api/docs`
