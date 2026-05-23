#!/usr/bin/env bash
# prod.sh — run backend + frontend in production mode (local Mac)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "══════════════════════════════════════════"
echo "  GeoMarket AI — Production (local)"
echo "══════════════════════════════════════════"

cleanup() {
  echo "Stopping servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ── Backend ──────────────────────────────────
cd "$ROOT/backend"
source .venv/bin/activate
alembic upgrade head
UVICORN_RELOAD=0 uvicorn main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers 2 &
BACKEND_PID=$!
deactivate

# ── Frontend ─────────────────────────────────
cd "$ROOT/frontend"
npm run build
npm run start -- --port 3000 &
FRONTEND_PID=$!

echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo ""

wait
