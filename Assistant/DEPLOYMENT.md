# ZUPdeCO AI Assistant — production deployment guide

## Production environment variables

### Backend

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | ≥32 random characters in production |
| `JWT_EXPIRES_IN` | No | Default `24h` |
| `GEMINI_API_KEY` | Yes | Google Gemini key |
| `PORT` | No | Default `3001` |
| `CORS_ORIGINS` | Yes (prod) | Comma-separated frontend origins |
| `NODE_ENV` | Yes | `production` |
| `TRUST_PROXY` | Recommended | `1` behind reverse proxies/load balancers |
| `ENABLE_SWAGGER` | No | Keep `false` in production |
| `ENABLE_PUBLIC_REGISTER` | No | Keep `false` unless intentional |
| `THROTTLE_LIMIT` | No | Requests per minute (default `120`) |
| `SLOW_REQUEST_MS` | No | Slow-request log threshold (default `2000`) |

### Frontend

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_API_URL` | Yes | Public API base including `/api` |

Copy root `.env.example` for Docker Compose.

## Docker deployment

```bash
cp .env.example .env
# edit secrets

docker compose up -d --build
```

Services:

- `postgres` — durable volume `postgres_data`
- `backend` — runs `prisma migrate deploy` then Nest
- `frontend` — Next.js standalone server

Health endpoints:

- Backend live: `GET /api/health/live`
- Backend ready: `GET /api/health/ready`
- Backend aggregate: `GET /api/health`

## Migration commands

```bash
cd assistant-backend
npx prisma migrate deploy
npx prisma generate
```

Development schema changes:

```bash
npx prisma migrate dev --name <change_name>
```

## Rollback procedure

1. Identify the last known-good image/tag and migration.
2. Scale traffic away from the failing revision.
3. Redeploy the previous application image.
4. Database rollbacks are **manual**: Prisma does not auto-down migrate. Restore from backup if a forward migration is unsafe to reverse.
5. Re-run smoke tests (login, chat, upload, benchmark).

## Backup strategy

- **PostgreSQL:** nightly `pg_dump` (or managed automated backups) of `assistant_ai`.
- Retain at least 7 daily + 4 weekly backups.
- Store off-host (object storage).
- After schema migrations, take an extra backup before and after deploy.

Example:

```bash
docker compose exec -T postgres pg_dump -U assistant assistant_ai > backup-$(date +%F).sql
```

## Restore strategy

```bash
# stop writers
docker compose stop backend frontend

# restore
cat backup-YYYY-MM-DD.sql | docker compose exec -T postgres psql -U assistant -d assistant_ai

# start services
docker compose start backend frontend
```

Validate with `/api/health/ready` and a login smoke test.

## Scaling recommendations

- Scale **frontend** and **backend** independently behind a reverse proxy.
- Keep a single primary Postgres (or managed HA). Async benchmark jobs are persisted in Postgres and can be polled from any instance; job execution resumes from `PENDING`/`RUNNING` rows after restart.
- Set `TRUST_PROXY` when terminating TLS at a load balancer.
- Prefer horizontal scaling of API replicas; ensure shared Postgres and identical `JWT_SECRET`.
- Embedding model load is process-local — expect higher memory per backend replica.

## Security checklist

- [ ] Strong unique `JWT_SECRET` (≥32 chars)
- [ ] `NODE_ENV=production`
- [ ] Swagger disabled (`ENABLE_SWAGGER` unset/false)
- [ ] Public registration disabled
- [ ] `CORS_ORIGINS` limited to real frontend origins
- [ ] TLS terminated at proxy; HSTS configured at edge
- [ ] Database not publicly exposed
- [ ] Secrets injected via env/secret manager (never committed)
- [ ] Rate limiting enabled (default Throttler guard)
- [ ] Helmet + compression enabled
- [ ] Logout revokes bearer tokens server-side
- [ ] Backups tested with a restore drill
