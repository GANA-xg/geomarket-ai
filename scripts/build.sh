#!/usr/bin/env bash
# build.sh — production build (frontend only; backend has no build step)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "▶  Building Next.js frontend..."
cd "$ROOT/frontend"
npm run build
echo "✅  Frontend build complete → frontend/.next/"
