#!/usr/bin/env bash
# install.sh — set up backend venv + frontend node_modules
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "══════════════════════════════════════════"
echo "  GeoMarket AI — Install"
echo "══════════════════════════════════════════"

# ── Backend ──────────────────────────────────
echo ""
echo "▶  Setting up Python backend..."
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "   Created .venv"
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "   Python dependencies installed"

# Download spaCy model if not present
python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null || \
  python -m spacy download en_core_web_sm --quiet
echo "   spaCy model ready"

deactivate

# ── Frontend ─────────────────────────────────
echo ""
echo "▶  Setting up Next.js frontend..."
cd "$ROOT/frontend"
npm install --legacy-peer-deps --silent
echo "   Node dependencies installed"

echo ""
echo "✅  Install complete!"
echo ""
echo "Next steps:"
echo "  1. cp .env.example backend/.env  (then fill in your API keys)"
echo "  2. ./scripts/dev.sh              (start both servers)"
