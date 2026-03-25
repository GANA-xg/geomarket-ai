from datetime import datetime, timezone

import httpx

from config.settings import settings
from services.cache import TTLCache
from services.http_utils import ExternalAPIError, request_json_with_retries

UPSTOX_QUOTE_URL = "https://api.upstox.com/v2/market-quote/quotes"
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"


class MarketDataService:
    def __init__(self):
        self.alpha_vantage_api_key = settings.ALPHA_VANTAGE_API_KEY
        self.upstox_access_token = settings.UPSTOX_ACCESS_TOKEN
        self.timeout = float(settings.REQUEST_TIMEOUT_SECONDS)
        self.cache = TTLCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
        self._client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        )

    @staticmethod
    def normalize_symbol(symbol: str) -> str:
        clean = (symbol or "").strip().upper()
        if not clean:
            return ""
        if "." not in clean:
            return f"{clean}.NS"
        return clean

    @staticmethod
    def _base_symbol(symbol: str) -> str:
        return symbol.split(".")[0].upper()

    async def _fetch_from_upstox(self, symbol: str) -> dict:
        if not self.upstox_access_token:
            raise ExternalAPIError("UPSTOX_ACCESS_TOKEN is not configured")

        base_symbol = self._base_symbol(symbol)
        instrument_candidates = [
            f"NSE_EQ|{base_symbol}",
            f"NSE|{base_symbol}",
            f"NSE_EQ|{symbol}",
        ]

        headers = {
            "Authorization": f"Bearer {self.upstox_access_token}",
            "Accept": "application/json",
        }

        for instrument_key in instrument_candidates:
            try:
                payload = await request_json_with_retries(
                    self._client,
                    "GET",
                    UPSTOX_QUOTE_URL,
                    params={"instrument_key": instrument_key},
                    headers=headers,
                    timeout=self.timeout,
                    retries=1,
                    validate=lambda data: isinstance(data, dict) and "data" in data,
                )
            except Exception:
                continue

            data = payload.get("data", {})
            quote = data.get(instrument_key) or next(iter(data.values()), None)
            if not isinstance(quote, dict):
                continue

            raw_price = quote.get("last_price") or quote.get("ltp")
            if raw_price is None:
                continue

            timestamp = (
                quote.get("timestamp")
                or quote.get("last_trade_time")
                or datetime.now(timezone.utc).isoformat()
            )
            return {
                "symbol": symbol,
                "price": float(raw_price),
                "timestamp": timestamp,
            }

        raise ExternalAPIError(f"Upstox quote not found for {symbol}")

    async def _fetch_from_alpha_vantage(self, symbol: str) -> dict:
        if not self.alpha_vantage_api_key:
            raise ExternalAPIError("ALPHA_VANTAGE_API_KEY is not configured")

        payload = await request_json_with_retries(
            self._client,
            "GET",
            ALPHA_VANTAGE_URL,
            params={
                "function": "TIME_SERIES_DAILY_ADJUSTED",
                "symbol": symbol,
                "apikey": self.alpha_vantage_api_key,
            },
            timeout=self.timeout,
            retries=2,
            validate=lambda data: isinstance(data, dict),
        )

        series = payload.get("Time Series (Daily)") or {}
        if not isinstance(series, dict) or not series:
            raise ExternalAPIError("Alpha Vantage time series missing")

        latest_date = max(series.keys())
        latest_data = series.get(latest_date, {})
        raw_price = latest_data.get("4. close")
        if raw_price is None:
            raise ExternalAPIError("Alpha Vantage close price missing")

        return {
            "symbol": symbol,
            "price": float(raw_price),
            "timestamp": latest_date,
        }

    async def get_live_price(self, symbol: str) -> dict:
        normalized_symbol = self.normalize_symbol(symbol)
        if not normalized_symbol:
            raise ExternalAPIError("Symbol is required")

        cache_key = f"price:{normalized_symbol}"

        async def _load_price() -> dict:
            try:
                return await self._fetch_from_upstox(normalized_symbol)
            except Exception:
                return await self._fetch_from_alpha_vantage(normalized_symbol)

        return await self.cache.get_or_set(cache_key, _load_price)


market_data_service = MarketDataService()
