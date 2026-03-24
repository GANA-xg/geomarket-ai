import os
import sys
import asyncio

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, "/app")

from database.session import SessionLocal
from routes.api_router import api_router
from services.buffett_screener import buffett_screener
from services.news_fetcher import news_fetcher
from services.realtime_hub import realtime_hub

app = FastAPI(title="GeoMarket AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler(timezone="UTC")


async def scheduled_news_job():
    db = SessionLocal()
    try:
        await news_fetcher.process_news_cycle(db)
    finally:
        db.close()


@app.on_event("startup")
async def on_startup():
    asyncio.create_task(asyncio.to_thread(buffett_screener.run_full_screen))
    if not scheduler.get_jobs():
        scheduler.add_job(scheduled_news_job, "interval", minutes=15, id="news-processing")
        scheduler.start()
    # Prime one run at startup so dashboard has data quickly, without blocking startup.
    asyncio.create_task(scheduled_news_job())


@app.on_event("shutdown")
def on_shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/")
def read_root():
    return {"message": "Welcome to GeoMarket AI API"}


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
