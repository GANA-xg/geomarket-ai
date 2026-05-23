# GeoMarket AI

Convert geopolitical news into Indian stock market signals using Warren Buffett's value investing philosophy and Wall Street quant factors.

---

## Architecture

```
geomarket-ai/
├── backend/          FastAPI + SQLAlchemy + APScheduler
├── frontend/         Next.js 14 App Router + Tailwind CSS + Leaflet
├── scripts/          install / dev / build / prod helpers
├── .env.example      environment variable template
├── vercel.json       Vercel frontend deployment config
└── README.md
```

### Backend (`backend/`)
| Layer | Tech |
|---|---|
| Framework | FastAPI 0.115 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | SQLAlchemy 2 + Alembic migrations |
| AI/NLP | OpenAI GPT-4o-mini, spaCy NER, FinBERT (opt-in) |
| Scheduler | APScheduler — news every 15 min |
| Real-time | WebSockets (live sentiment, map, alerts) |

### Frontend (`frontend/`)
| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS 3 |
| Maps | Leaflet + leaflet.heat |
| Charts | Recharts |
| Icons | Lucide React |

---

## Quick Start (local Mac)

### 1. Clone & install
```bash
git clone https://github.com/GANA-xg/geomarket-ai.git
cd geomarket-ai
./scripts/install.sh
```

### 2. Configure environment
```bash
cp .env.example backend/.env
# Edit backend/.env and fill in your API keys
```

### 3. Run in development
```bash
./scripts/dev.sh
```
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- API Docs → http://localhost:8000/docs

---

## Environment Variables

Copy `.env.example` to `backend/.env` and set:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No | Defaults to SQLite. Use PostgreSQL URL in prod. |
| `OPENAI_API_KEY` | Yes (for AI) | GPT-4o-mini for geo extraction + sector analysis |
| `NEWS_API_KEY` | Yes (for news) | NewsAPI.org key |
| `FMP_API_KEY` | No | Financial Modeling Prep — fundamentals |
| `UPSTOX_ACCESS_TOKEN` | No | Upstox — live NSE quotes |
| `ALPHA_VANTAGE_API_KEY` | No | Fallback market data |
| `SECRET_KEY` | Yes (prod) | JWT signing key |
| `ENABLE_FINBERT` | No | `1` to enable FinBERT (needs ~2 GB RAM + torch) |

---

## Deployment

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Render auto-detects `render.yaml` — just add your env vars in the dashboard
5. Add a **PostgreSQL** database on Render and set `DATABASE_URL`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `https://github.com/GANA-xg/geomarket-ai`
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://geomarket-backend.onrender.com`)
   - `NEXT_PUBLIC_WS_URL` = `wss://geomarket-backend.onrender.com`
5. Deploy

### Local production mode
```bash
./scripts/build.sh   # builds Next.js
./scripts/prod.sh    # runs both servers in production mode
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check + DB status |
| GET | `/api/dashboard/stats` | Aggregated stats + sentiment |
| GET | `/api/signals/latest` | Top 10 active BUY/SELL/HOLD signals |
| GET | `/api/stocks` | Stocks with filters (sector, signal, buffett) |
| GET | `/api/news/latest` | Latest 50 news events with AI sentiment |
| GET | `/api/geo-markers` | Geo markers for map pins |
| GET | `/api/geo-heatmap` | AI-extracted heatmap `{heatmap: [[lat,lng,weight]]}` |
| GET | `/api/portfolio/summary` | Open positions with live P&L |
| POST | `/api/portfolio/positions` | Add position |
| PUT | `/api/portfolio/positions/:id` | Update position |
| DELETE | `/api/portfolio/positions/:id` | Delete position |
| GET | `/api/market/signal/:symbol` | On-demand signal for any NSE symbol |
| WS | `/ws/live-sentiment` | Real-time sentiment stream |
| WS | `/ws/live-map` | Real-time geo event stream |
| WS | `/ws/alerts` | Real-time portfolio alerts |

---

## How It Works

1. **News ingestion** — NewsAPI fetches global headlines every 15 minutes
2. **AI processing** — GPT-4o-mini extracts affected sectors, regions, and Indian stocks; spaCy extracts named entities; FinBERT (opt-in) scores sentiment
3. **Buffett screener** — 50+ NSE stocks screened at startup against 10 Buffett criteria (ROE, D/E, promoter holding, PEG, etc.)
4. **Quant scoring** — Momentum, Value, Quality, Low-Vol, Revision factors → composite score 0–100
5. **Signal generation** — BUY if composite ≥ 70 + Buffett qualified; SELL if composite < 40
6. **Geo heatmap** — GPT-4o-mini extracts lat/lng + impact weight from each article → Leaflet heatmap
7. **Real-time** — WebSocket broadcasts to frontend on every new event
