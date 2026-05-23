#!/usr/bin/env bash
# dev.sh — start backend + frontend in development mode
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "══════════════════════════════════════════"
echo "  GeoMarket AI — Dev"
echo "══════════════════════════════════════════"
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo "  API Docs → http://localhost:8000/docs"
echo "══════════════════════════════════════════"
echo ""

# Trap Ctrl+C and kill both processes
cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ── Backend ──────────────────────────────────
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "⚠  No .venv found. Run ./scripts/install.sh first."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "⚠  No backend/.env found. Copying from .env.example..."
  cp "$ROOT/.env.example" .env
fi

source .venv/bin/activate
alembic upgrade head
UVICORN_RELOAD=1 uvicorn main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload \
  --reload-dir . \
  --reload-exclude ".venv/*" \
  --reload-exclude "**/__pycache__/*" &
BACKEND_PID=$!
deactivate

# ── Frontend ─────────────────────────────────
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "⚠  No node_modules found. Run ./scripts/install.sh first."
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi

if [ ! -f ".env.local" ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
  echo "NEXT_PUBLIC_WS_URL=ws://localhost:8000" >> .env.local
fi

npm run dev &
FRONTEND_PID=$!

wait
