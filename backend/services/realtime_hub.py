import asyncio
import json
import os
import sys
from typing import Any

from fastapi import WebSocket

sys.path.insert(0, "/app")


class TopicConnectionManager:
    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = {
            "live-sentiment": set(),
            "live-map": set(),
            "alerts": set(),
        }
        self._lock = asyncio.Lock()

    async def connect(self, topic: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(topic, set()).add(websocket)

    async def disconnect(self, topic: str, websocket: WebSocket):
        async with self._lock:
            topic_set = self._connections.get(topic, set())
            if websocket in topic_set:
                topic_set.remove(websocket)

    async def broadcast(self, topic: str, payload: dict[str, Any]):
        message = json.dumps(payload, default=str)
        sockets = list(self._connections.get(topic, set()))
        stale: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_text(message)
            except Exception:
                stale.append(socket)

        if stale:
            async with self._lock:
                topic_set = self._connections.get(topic, set())
                for socket in stale:
                    if socket in topic_set:
                        topic_set.remove(socket)


realtime_hub = TopicConnectionManager()
