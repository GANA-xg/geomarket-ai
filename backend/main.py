import os
import sys
import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except Exception:
    AsyncIOScheduler = None

sys.path.insert(0, "/app")

from database.session import SessionLocal
from routes.api_router import api_router
from services.buffett_screener import buffett_screener
from services.news_fetcher import news_fetcher
from services.realtime_hub import realtime_hub

logger = logging.getLogger(__name__)

app = FastAPI(title="GeoMarket AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://geomarket-ai.vercel.app",
        "https://geomarket.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler(timezone="UTC") if AsyncIOScheduler else None


async def scheduled_news_job():
    db = None
    try:
        db = SessionLocal()
        await news_fetcher.process_news_cycle(db)
    except Exception as exc:
        logger.warning("Scheduled news job skipped: %s", exc)
    finally:
        if db is not None:
            db.close()


async def run_buffett_screen_job():
    try:
        await asyncio.to_thread(buffett_screener.run_full_screen)
    except Exception as exc:
        logger.warning("Buffett screener skipped: %s", exc)


@app.on_event("startup")
async def on_startup():
    asyncio.create_task(run_buffett_screen_job())
    if scheduler and not scheduler.get_jobs():
        scheduler.add_job(scheduled_news_job, "interval", minutes=15, id="news-processing")
        scheduler.start()
    # Prime one run at startup so dashboard has data quickly, without blocking startup.
    asyncio.create_task(scheduled_news_job())


@app.on_event("shutdown")
def on_shutdown():
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/")
def read_root():
    return {"message": "Welcome to GeoMarket AI API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api")


@app.websocket("/ws/live-sentiment")
async def websocket_live_sentiment(websocket: WebSocket):
    await realtime_hub.connect("live-sentiment", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_hub.disconnect("live-sentiment", websocket)


@app.websocket("/ws/live-map")
async def websocket_live_map(websocket: WebSocket):
    await realtime_hub.connect("live-map", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_hub.disconnect("live-map", websocket)


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await realtime_hub.connect("alerts", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_hub.disconnect("alerts", websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
