# GeoMarket AI

Convert geopolitical news into Indian stock market signals using Warren Buffett's value investing philosophy and Wall Street quant factors.

## Architecture & Structure

This repository follows a strict separation of concerns:

- `frontend/`: Next.js 14 App Router, Tailwind CSS, Leaflet.js
  - `app/`: Next.js page routes (`/dashboard`, `/map`, `/news`, `/stocks`, `/portfolio`)
  - `components/`: Granular UI elements (`ui/`, `charts/`, `map/`, `signals/`, `portfolio/`, `alerts/`)
  - `lib/`: Utilities, Hooks, Types, and API calls.
  - `styles/`: Global styles

- `backend/`: FastAPI Python 3.11 Backend
  - `main.py`: Entrypoint for FastAPI (only app init and router).
  - `routes/`: All API endpoints.
  - `services/`: Business logic (AI processing, Market Engines, Sentiment Analysis).
  - `models/`: SQLAlchemy ORM definitions.
  - `database/`: Connections and Alembic migrations.
  - `config/`: App settings and Macro states.
  - `tests/`: Unit and Integration testing folders.

- `docker/`: Contains backend and frontend Dockerfiles.
- `docs/`: Architecture mappings and API references.

## Getting Started

1. Copy `.env.example` to `.env` and fill out your keys.
2. Run `docker-compose up --build -d`
3. Access Frontend at `http://localhost:3000`
4. Access Backend API at `http://localhost:8000/docs`
