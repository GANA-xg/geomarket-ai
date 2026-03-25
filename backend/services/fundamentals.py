import asyncio

import httpx

from config.settings import settings
from services.cache import TTLCache
from services.http_utils import ExternalAPIError, request_json_with_retries

FMP_PROFILE_URL = "https://financialmodelingprep.com/stable/profile"
FMP_BALANCE_SHEET_URL = "https://financialmodelingprep.com/api/v3/balance-sheet-statement/{symbol}"


class FundamentalsService:
    def __init__(self):
        self.fmp_api_key = settings.FMP_API_KEY
        self.timeout = float(settings.REQUEST_TIMEOUT_SECONDS)
        self.cache = TTLCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
        self._client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        )

    @staticmethod
    def _to_float(value):
        try:
            if value is None:
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    async def _fetch_profile(self, symbol: str) -> dict:
        payload = await request_json_with_retries(
            self._client,
            "GET",
            FMP_PROFILE_URL,
            params={"symbol": symbol, "apikey": self.fmp_api_key},
            timeout=self.timeout,
            retries=2,
            validate=lambda data: isinstance(data, list),
        )
        if not payload:
            raise ExternalAPIError(f"FMP profile not found for {symbol}")
        profile = payload[0]
        if not isinstance(profile, dict):
            raise ExternalAPIError("FMP profile payload invalid")
        return profile

    async def _fetch_balance_sheet(self, symbol: str) -> dict:
        payload = await request_json_with_retries(
            self._client,
            "GET",
            FMP_BALANCE_SHEET_URL.format(symbol=symbol),
            params={"limit": 1, "apikey": self.fmp_api_key},
            timeout=self.timeout,
            retries=2,
            validate=lambda data: isinstance(data, list),
        )
        if not payload:
            raise ExternalAPIError(f"FMP balance sheet not found for {symbol}")
        statement = payload[0]
        if not isinstance(statement, dict):
            raise ExternalAPIError("FMP balance sheet payload invalid")
        return statement

    async def get_fundamentals(self, symbol: str) -> dict:
        if not self.fmp_api_key:
            raise ExternalAPIError("FMP_API_KEY is not configured")

        normalized_symbol = (symbol or "").strip().upper()
        if not normalized_symbol:
            raise ExternalAPIError("Symbol is required")

        cache_key = f"fundamentals:{normalized_symbol}"

        async def _load_fundamentals() -> dict:
            # Gather profile and balance-sheet requests concurrently for low latency.
            profile_task = self._fetch_profile(normalized_symbol)
            balance_task = self._fetch_balance_sheet(normalized_symbol)
            profile_data, balance_data = await asyncio.gather(profile_task, balance_task)

            pe = self._to_float(profile_data.get("pe"))
            beta = self._to_float(profile_data.get("beta"))
            market_cap = self._to_float(profile_data.get("mktCap"))
            equity = self._to_float(balance_data.get("totalStockholdersEquity"))

            pb_ratio = None
            if market_cap is not None and equity and equity > 0:
                pb_ratio = market_cap / equity

            return {
                "pe": pe,
                "pb": pb_ratio,
                "beta": beta,
                "marketCap": market_cap,
            }

        return await self.cache.get_or_set(cache_key, _load_fundamentals)


fundamentals_service = FundamentalsService()
