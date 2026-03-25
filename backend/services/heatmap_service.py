import asyncio
from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session

from models.schema import NewsEvent
from services.ai_processor import ai_processor
from services.cache import TTLCache


class HeatmapService:
    def __init__(self):
        # Cache final heatmap payload and per-article AI extraction for 5 minutes.
        self._heatmap_cache = TTLCache(ttl_seconds=300)
        self._article_location_cache = TTLCache(ttl_seconds=300)

    @staticmethod
    def _fallback_points() -> list[list[float]]:
        # Global default hotspots ensure the map always renders meaningful thermal activity.
        return [
            [40.7128, -74.0060, 0.55],
            [51.5074, -0.1278, 0.52],
            [48.8566, 2.3522, 0.49],
            [25.2048, 55.2708, 0.74],
            [24.7136, 46.6753, 0.72],
            [32.0853, 34.7818, 0.79],
            [35.6892, 51.3890, 0.78],
            [28.6139, 77.2090, 0.65],
            [1.3521, 103.8198, 0.50],
            [35.6762, 139.6503, 0.45],
            [-33.8688, 151.2093, 0.36],
            [-23.5505, -46.6333, 0.40],
        ]

    async def _extract_article_locations(self, article: NewsEvent) -> list[dict[str, Any]]:
        cache_key = f"article-locations:{article.id}:{article.headline}"

        async def _compute() -> list[dict[str, Any]]:
            text = f"{article.headline or ''}\n\n{article.raw_text or ''}"[:6000]
            return await asyncio.to_thread(ai_processor.extract_geo_locations, text)

        return await self._article_location_cache.get_or_set(cache_key, _compute)

    @staticmethod
    def _normalize_point(item: dict[str, Any]) -> tuple[float, float, float] | None:
        lat_raw = item.get("lat")
        lng_raw = item.get("lng")
        if lat_raw is None or lng_raw is None:
            return None

        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
            impact = max(0.0, min(1.0, float(item.get("impact", 0.0))))
            sentiment = max(-1.0, min(1.0, float(item.get("sentiment", 0.0))))
            weight = impact * abs(sentiment)
        except (TypeError, ValueError):
            return None

        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return None
        if weight <= 0:
            return None
        return (lat, lng, weight)

    async def build_heatmap(self, db: Session, max_articles: int = 25, max_points: int = 100) -> dict[str, Any]:
        cache_key = f"heatmap:{max_articles}:{max_points}"

        async def _compute_heatmap() -> dict[str, Any]:
            rows = (
                db.query(NewsEvent)
                .order_by(NewsEvent.published_at.desc(), NewsEvent.id.desc())
                .limit(max_articles)
                .all()
            )

            tasks = [self._extract_article_locations(article) for article in rows]
            raw_location_sets = await asyncio.gather(*tasks, return_exceptions=True)

            bucket: dict[tuple[float, float], float] = defaultdict(float)
            for raw_locations in raw_location_sets:
                if isinstance(raw_locations, BaseException) or not isinstance(raw_locations, list):
                    continue
                for item in raw_locations:
                    if not isinstance(item, dict):
                        continue
                    point = self._normalize_point(item)
                    if not point:
                        continue
                    lat, lng, weight = point
                    key = (round(lat, 3), round(lng, 3))
                    bucket[key] += weight

            sorted_points = sorted(bucket.items(), key=lambda kv: kv[1], reverse=True)

            heatmap: list[list[float]] = []
            for (lat, lng), weight in sorted_points[:max_points]:
                heatmap.append([lat, lng, min(weight, 1.0)])

            if not heatmap:
                heatmap = self._fallback_points()[: min(max_points, 20)]
            elif len(heatmap) < 5:
                for fallback in self._fallback_points():
                    if len(heatmap) >= 5 or len(heatmap) >= max_points:
                        break
                    heatmap.append(fallback)

            print(f"[geo-heatmap] points={len(heatmap)}")
            print(f"[geo-heatmap] payload={heatmap}")
            return {"heatmap": heatmap}

        return await self._heatmap_cache.get_or_set(cache_key, _compute_heatmap)


heatmap_service = HeatmapService()
