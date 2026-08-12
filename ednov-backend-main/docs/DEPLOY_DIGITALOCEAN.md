# Deploying ednov-backend on DigitalOcean App Platform

## Health check

- **HTTP path:** `/api/v1/health` (must be **HTTPS** if the app is served over TLS).
- The route is public (no JWT). Configure this in App Platform → **Health checks**.

## Required app-level env vars

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | Usually injected by App Platform; app uses `process.env.PORT`. |
| `DATABASE_URL` | Managed Postgres connection string. Prefer the **private** URL in the same region/VPC if available. |
| `DATABASE_SSL` | Set `true` for DO Managed PostgreSQL (TLS). |
| `DATABASE_SCHEMA` | Default `public` unless you use another schema. |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Full key; in DO UI paste as one line with `\n` for newlines, or use a secret. |
| `CORS_ORIGINS` | Comma-separated origins: your web app, Expo dev if needed, **no spaces** after commas. Example: `https://app.example.com,https://www.example.com` |

Optional:

- `GROQ_API_KEY` — only if you use AI/session features.
- `LOG_LEVEL`, `SERVICE_NAME`, `DATABASE_LOGGING`

## Migrations

The Docker image **does not** run migrations. After deploy (or via a **Job** / one-off console):

```bash
npm run migration:run
```

Use the same `DATABASE_URL` / SSL settings as the app. For a one-off job, use an image or build that includes `typeorm` + `ts-node` + `data-source.ts`, or run migrations from CI before deploy.

## Build

- App Platform should use the repo **root** that contains `Dockerfile` (or set **Dockerfile path** to `ednov-backend/Dockerfile` and context accordingly).
- First deploy: ensure `main` (or your branch) includes a passing `npm run build` locally.

## Common failures

1. **502 / unhealthy** — DB unreachable: check `DATABASE_SSL`, firewall, and that the DB trusts App Platform.
2. **CORS** — Browser/mobile calls blocked: expand `CORS_ORIGINS`.
3. **Firebase** — `FIREBASE_PRIVATE_KEY` must be valid; escaped newlines (`\n`) are normalized at startup.
