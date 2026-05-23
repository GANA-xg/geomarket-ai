import os
from typing import Any
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session

from models.schema import GeoMarker, NewsEvent  # noqa: E402
from config.settings import settings  # noqa: E402
from services.ai_processor import ai_processor  # noqa: E402
from services.cache import TTLCache  # noqa: E402
from services.http_utils import request_json_with_retries  # noqa: E402
from services.realtime_hub import realtime_hub  # noqa: E402

NEWS_API_URL = "https://newsapi.org/v2/everything"


class NewsFetcher:
    def __init__(self):
        self.api_key = settings.NEWS_API_KEY
        self.timeout = float(settings.REQUEST_TIMEOUT_SECONDS)
        self.cache = TTLCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
        self._client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        )

    @staticmethod
    def _resolve_lat_lng(region: str) -> tuple[float, float]:
        mapping = {
            "India": (20.5937, 78.9629),
            "United States": (37.0902, -95.7129),
            "China": (35.8617, 104.1954),
            "Russia": (61.5240, 105.3188),
            "Europe": (54.5260, 15.2551),
            "Middle East": (29.2985, 42.5510),
            "Global": (20.0, 0.0),
        }
        return mapping.get(region, (20.0, 0.0))

    async def fetch_latest_news(
        self,
        query: str = "India OR global economy OR oil OR war OR inflation",
        page_size: int = 10,
    ) -> list[dict[str, Any]]:
        def fallback_articles() -> list[dict[str, Any]]:
            now = datetime.now(timezone.utc).isoformat()
            return [
                {
                    "headline": "Brent crude prices rise after supply disruptions in Middle East",
                    "source": "Reuters",
                    "published_at": now,
                    "raw_text": "Oil prices jumped as shipping routes faced uncertainty and global energy traders repriced risk.",
                    "region": "Middle East",
                },
                {
                    "headline": "US treasury yields cool after softer inflation print",
                    "source": "Bloomberg",
                    "published_at": now,
                    "raw_text": "Lower inflation expectations improved global risk appetite and supported equities.",
                    "region": "United States",
                },
            ]

        if not self.api_key or self.api_key.startswith("your_"):
            return fallback_articles()

        params = {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": min(max(1, page_size), 10),
            "apiKey": self.api_key,
        }

        cache_key = f"news:{params['q']}:{params['pageSize']}"

        async def _load_news() -> list[dict[str, Any]]:
            try:
                data = await request_json_with_retries(
                    self._client,
                    "GET",
                    NEWS_API_URL,
                    params=params,
                    timeout=self.timeout,
                    retries=2,
                    validate=lambda payload: isinstance(payload, dict) and "articles" in payload,
                )
            except Exception:
                return fallback_articles()

            results: list[dict[str, Any]] = []
            for article in data.get("articles", [])[: params["pageSize"]]:
                headline = article.get("title") or "Untitled"
                body = article.get("content") or article.get("description") or ""
                source = (article.get("source") or {}).get("name") or "Unknown"
                published = article.get("publishedAt") or datetime.now(timezone.utc).isoformat()

                results.append(
                    {
                        "headline": str(headline).strip(),
                        "source": str(source).strip(),
                        "published_at": str(published),
                        "raw_text": str(body).strip(),
                        "region": "Global",
                    }
                )

            return results if results else fallback_articles()

        return await self.cache.get_or_set(cache_key, _load_news)

    async def process_news_cycle(self, db: Session):
        articles = await self.fetch_latest_news()
        for article in articles:
            headline = article.get("headline", "")
            body = article.get("raw_text", "")

            existing = (
                db.query(NewsEvent)
                .filter(NewsEvent.headline == headline)
                .order_by(NewsEvent.id.desc())
                .first()
            )
            if existing:
                continue

            processed = ai_processor.process_article(headline=headline, body=body)
            llm = processed["llm"]
            region = llm.get("primary_region") or article.get("region") or "Global"

            try:
                published_at = datetime.fromisoformat(str(article.get("published_at", "")).replace("Z", "+00:00"))
            except Exception:
                published_at = datetime.now(timezone.utc)

            news = NewsEvent(
                headline=headline,
                source=article.get("source"),
                published_at=published_at,
                raw_text=body,
                region=article.get("region", "Global"),
                sentiment_score=processed["sentiment_score"],
                sentiment_label=processed["sentiment_label"],
                sentiment_confidence=processed["confidence"],
                combined_sentiment_score=processed["combined_sentiment_score"],
                entities_json=processed["entities"],
                affected_sectors_json=llm.get("affected_sectors", []),
                event_type=llm.get("event_type", "Economic Policy"),
                primary_region=region,
                market_impact_direction=int(llm.get("market_impact_direction", 0) or 0),
                impact_magnitude=llm.get("impact_magnitude", "LOW"),
                india_specific_impact=llm.get("india_specific_impact", ""),
                affected_indian_stocks_json=llm.get("affected_indian_stocks", []),
                llm_analysis_json=llm,
            )
            db.add(news)
            db.commit()
            db.refresh(news)

            lat, lng = self._resolve_lat_lng(region)
            marker = GeoMarker(
                news_event_id=news.id,
                lat=lat,
                lng=lng,
                country=region,
                impact_color=processed["impact_color"],
                affected_sectors_json=llm.get("affected_sectors", []),
            )
            db.add(marker)
            db.commit()
            db.refresh(marker)

            for ticker in llm.get("affected_indian_stocks", [])[:5]:
                await realtime_hub.broadcast(
                    "live-sentiment",
                    {
                        "ticker": ticker,
                        "sentiment_label": processed["sentiment_label"],
                        "score": processed["combined_sentiment_score"],
                        "headline": headline,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )

            await realtime_hub.broadcast(
                "live-map",
                {
                    "lat": marker.lat,
                    "lng": marker.lng,
                    "impact_color": marker.impact_color,
                    "headline": news.headline,
                    "sectors": marker.affected_sectors_json or [],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )


news_fetcher = NewsFetcher()
