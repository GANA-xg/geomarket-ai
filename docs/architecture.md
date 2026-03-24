# GeoMarket AI Architecture

## Overview
GeoMarket AI converts geopolitics into market signals. It utilizes a Next.js frontend and a FastAPI backend, orchestrated by Docker Compose.

## Frontend (Next.js 14 App Router)
- **App Structure**: The Next.js application separates routing views (`app/dashboard`, `app/map`) and reusable UI components (`components/ui`, `components/charts`).
- **Styling**: Tailwind CSS is used globally (`styles/globals.css`).
- **Real-time Map**: Powered by Leaflet.js inside `components/map/`.

## Backend (FastAPI, Python 3.11)
Maintained strictly under `backend/`:
- **Routes** (`routes/`): API endpoints separating presentation logic from business logic.
- **Services** (`services/`): Pure business logic (e.g., `ai_processor.py`, `buffett_screener.py`). Never instantiated directly in endpoints without DI, executing heavy computations decoupling HTTP handling.
- **Models & DB** (`models/`, `database/`): SQLAlchemy models and Alembic migration scripts.
- **Config** (`config/`): Settings and macro-state variables (Pydantic `BaseSettings`).

## Database
PostgreSQL 15 running in a container. Stores structured news, geolocation markers, stock data, generated trading signals, and portfolio statuses.

## AI Engine
- **FinBERT**: Used via HuggingFace `transformers` to predict sentiment (Positive, Negative, Neutral).
- **spaCy**: Used for Named Entity Recognition (NER) to pull out relevant global organizations, political actors, and regions.
