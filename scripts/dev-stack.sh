#!/usr/bin/env bash
# Start the local Ednov + Assistant stack (3 terminals recommended).
# Usage:
#   bash scripts/dev-stack.sh
# Or from workspace root (concurrent):
#   npm run dev:all
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Prerequisites"
command -v node >/dev/null || { echo "Node.js required"; exit 1; }
command -v psql >/dev/null || { echo "psql required (Postgres client)"; exit 1; }

echo "==> Ensuring local databases exist"
psql -h localhost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='ednov'" | grep -q 1 \
  || psql -h localhost -d postgres -c "CREATE DATABASE ednov;"
psql -h localhost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='assistant_ai'" | grep -q 1 \
  || psql -h localhost -d postgres -c "CREATE DATABASE assistant_ai;"

echo ""
echo "Preferred one-command start (from $ROOT):"
echo "  npm run dev:all"
echo "  → ednov-backend :3000 · assistant-backend :3001 · ednov-web :5173"
echo ""
echo "Or start these in 3 separate terminals:"
echo ""
echo "  # 1) Ednov API  → http://localhost:3000"
echo "  cd $ROOT/ednov-backend-main && npm run dev"
echo ""
echo "  # 2) Assistant API → http://localhost:3001"
echo "  cd $ROOT/Assistant/assistant-backend && npm run start:dev"
echo ""
echo "  # 3) Ednov Web → http://localhost:5173"
echo "  cd $ROOT/ednov-web-main && npm run dev"
echo ""
echo "IMPORTANT: Replace Firebase placeholders in:"
echo "  - ednov-backend-main/.env   (FIREBASE_*)"
echo "  - ednov-web-main/.env       (VITE_FIREBASE_*)"
echo "Login will not work until real Firebase credentials are set."
echo ""
echo "Optional standalone Assistant UI:"
echo "  cd $ROOT/Assistant/assistant-frontend && npm run dev"
echo "  (AUTH_MODE=local — demo@zupdeco.fr / Password123 after seed)"
