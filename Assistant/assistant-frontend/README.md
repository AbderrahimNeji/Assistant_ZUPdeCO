# ZUPdeCO AI Assistant — Frontend

Next.js UI for the ZUPdeCO AI Assistant.

See the monorepo root [README](../README.md) for architecture, env vars, and deployment.

## Quick start

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

App: `http://localhost:3000`  
API URL must point at the Nest backend (default `http://localhost:3001/api`).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
- `npm test` — Vitest
