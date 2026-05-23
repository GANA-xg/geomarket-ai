#!/usr/bin/env bash
set -euo pipefail

# Change to the backend directory regardless of where the script is called from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "▶  Running Alembic migrations..."
alembic upgrade head

echo "▶  Starting uvicorn..."
if [ "${UVICORN_RELOAD:-1}" = "1" ]; then
  uvicorn main:app \
    --host 127.0.0.1 \
    --port "${PORT:-8000}" \
    --reload \
    --reload-dir . \
    --reload-exclude ".venv/*" \
    --reload-exclude "**/__pycache__/*"
else
  uvicorn main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}"
fi
