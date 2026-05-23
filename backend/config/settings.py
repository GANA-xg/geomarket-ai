from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "GeoMarket AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = "sqlite:///./geomarket.db"

    # Third-party API keys
    NEWS_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    UPSTOX_ACCESS_TOKEN: str = ""
    FMP_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    TRADINGVIEW_SESSION: str = ""
    SCREENER_IN_API: str = ""

    # Auth
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI/ML toggles — keep memory light by default
    ENABLE_FINBERT: str = "0"
    ENABLE_SPACY: str = "1"

    # Performance
    REQUEST_TIMEOUT_SECONDS: float = 3.0
    CACHE_TTL_SECONDS: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
