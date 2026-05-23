import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except Exception:
    AsyncIOScheduler = None  # type: ignore[assignment,misc]

from database.session import SessionLocal, engine
from models.schema import Base
from routes.api_router import api_router
from services.buffett_screener import buffett_screener
from services.news_fetcher import news_fetcher
from services.realtime_hub import realtime_hub

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
scheduler = AsyncIOScheduler(timezone="UTC") if AsyncIOScheduler else None


async def _news_job() -> None:
    db = SessionLocal()
    try:
        await news_fetcher.process_news_cycle(db)
    except Exception as exc:
        logger.warning("Scheduled news job skipped: %s", exc)
    finally:
        db.close()


async def _buffett_job() -> None:
    try:
        await asyncio.to_thread(buffett_screener.run_full_screen)
    except Exception as exc:
        logger.warning("Buffett screener skipped: %s", exc)


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (SQLite dev convenience).
    Base.metadata.create_all(bind=engine)

    # Kick off background tasks without blocking startup.
    asyncio.create_task(_buffett_job())
    asyncio.create_task(_news_job())

    if scheduler and not scheduler.get_jobs():
        scheduler.add_job(_news_job, "interval", minutes=15, id="news-processing")
        scheduler.start()
        logger.info("APScheduler started — news job every 15 min")

    logger.info("GeoMarket AI backend started")
    yield

    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
    logger.info("GeoMarket AI backend stopped")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="GeoMarket AI API",
    version="1.0.0",
    description="Geopolitical news → Indian stock market signals via Buffett + quant factors.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://geomarket-ai.vercel.app",
        "https://geomarket.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["root"])
def read_root():
    return {"message": "GeoMarket AI API", "docs": "/docs"}


@app.get("/health", tags=["health"])
def health_check():
    """Lightweight health check — verifies DB connectivity."""
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as exc:
        logger.error("DB health check failed: %s", exc)
        db_status = "error"
    return {"status": "ok", "db": db_status}


# ---------------------------------------------------------------------------
# WebSocket endpoints
# ---------------------------------------------------------------------------
@app.websocket("/ws/live-sentiment")
async def ws_live_sentiment(websocket: WebSocket):
    await realtime_hub.connect("live-sentiment", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_hub.disconnect("live-sentiment", websocket)


@app.websocket("/ws/live-map")
async def ws_live_map(websocket: WebSocket):
    await realtime_hub.connect("live-map", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_hub.disconnect("live-map", websocket)


@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket):
    await realtime_hub.connect("alerts", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_hub.disconnect("alerts", websocket)


# ---------------------------------------------------------------------------
# Dev entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
        reload_dirs=["."],
        reload_excludes=[".venv/*", "**/__pycache__/*"],
    )
