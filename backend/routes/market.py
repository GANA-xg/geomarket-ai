import asyncio

from fastapi import APIRouter, HTTPException, Query

from services.analysis import market_analysis_service
from services.fundamentals import fundamentals_service
from services.http_utils import ExternalAPIError
from services.market_data import market_data_service
from services.news_fetcher import news_fetcher

market_router = APIRouter()


@market_router.get("/market/signal/{symbol}")
async def get_market_signal(symbol: str):
    normalized_symbol = market_data_service.normalize_symbol(symbol)

    try:
        price_task = market_data_service.get_live_price(normalized_symbol)
        fundamentals_task = fundamentals_service.get_fundamentals(normalized_symbol)
        news_task = news_fetcher.fetch_latest_news(
            query="India OR global economy OR oil OR war OR inflation",
            page_size=10,
        )

        price_data, fundamentals_data, news_items = await asyncio.gather(
            price_task,
            fundamentals_task,
            news_task,
        )

        signal = await market_analysis_service.generate_signal(
            symbol=normalized_symbol,
            price_data=price_data,
            fundamentals=fundamentals_data,
            news_items=news_items,
        )
        return signal
    except ExternalAPIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to generate market signal: {exc}") from exc


@market_router.get("/test/all")
async def test_all(symbol: str = Query(default="RELIANCE.NS")):
    normalized_symbol = market_data_service.normalize_symbol(symbol)

    try:
        price_task = market_data_service.get_live_price(normalized_symbol)
        fundamentals_task = fundamentals_service.get_fundamentals(normalized_symbol)
        news_task = news_fetcher.fetch_latest_news(
            query="India OR global economy OR oil OR war OR inflation",
            page_size=10,
        )

        price_data, fundamentals_data, news_items = await asyncio.gather(
            price_task,
            fundamentals_task,
            news_task,
        )

        return {
            "symbol": normalized_symbol,
            "price": price_data,
            "fundamentals": fundamentals_data,
            "news_count": len(news_items),
        }
    except ExternalAPIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Integration test route failed: {exc}") from exc
