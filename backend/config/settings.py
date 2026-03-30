import os
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "GeoMarket AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # DB
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./geomarket.db")

    # Third party
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    UPSTOX_ACCESS_TOKEN: str = os.getenv("UPSTOX_ACCESS_TOKEN", "")
    FMP_API_KEY: str = os.getenv("FMP_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    TRADINGVIEW_SESSION: str = os.getenv("TRADINGVIEW_SESSION", "")
    SCREENER_IN_API: str = os.getenv("SCREENER_IN_API", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")

    # Performance and resilience
    REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "3"))
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "60"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
